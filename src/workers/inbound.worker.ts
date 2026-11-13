import { UnrecoverableError, Worker } from "bullmq";
import { env } from "../config/env";
import { prisma } from "../config/db";
import { createMessageSender } from "../messaging";
import { PermanentSendError } from "../messaging/sendErrors";
import { INBOUND_QUEUE, type InboundMessageJob } from "../queues/inbound.queue";
import { handleInboundMessage } from "../services/inbound.service";

const sender = createMessageSender();

const worker = new Worker<InboundMessageJob>(
  INBOUND_QUEUE,
  async (job) => {
    try {
      await handleInboundMessage(job.data, sender);
    } catch (err) {
      if (err instanceof PermanentSendError) {
        throw new UnrecoverableError(err.message);
      }
      throw err;
    }
  },
  {
    connection: { url: env.REDIS_URL },
    concurrency: 1,
  },
);
worker.on("ready", () => {
  console.log("Worker is ready and waiting for jobs");
});

worker.on("completed", (job) => {
  console.log(`Done: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(
    `Failed: ${job?.id} (attempt ${job?.attemptsMade} of ${job?.opts.attempts}): ${err.message}`,
  );
});

worker.on("error", (err) => {
  console.error("Worker error:", err.message);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Finishing the current job, then stopping...`);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));