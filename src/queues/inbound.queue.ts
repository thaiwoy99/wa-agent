import { Queue } from "bullmq";
import { env } from "../config/env";

export type InboundMessageJob = {
  waMessageId: string;
  phoneNumberId: string;
  from: string;
  type: string;
  text: string | null;
  timestamp: string;
};

export const INBOUND_QUEUE = "inbound-messages";

export const inboundQueue = new Queue<InboundMessageJob>(INBOUND_QUEUE, {
  connection: { url: env.REDIS_URL },
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 24 * 60 * 60 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
  },
});

inboundQueue.on("error", (err) => {
  console.error("Inbound queue error:", err.message);
});

export function addInboundMessage(job: InboundMessageJob) {
  return inboundQueue.add("inbound-message", job, {
    jobId: job.waMessageId,
  });
}