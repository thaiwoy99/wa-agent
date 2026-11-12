import {
  addInboundMessage,
  type InboundMessageJob,
} from "../queues/inbound.queue";
import { withTimeout } from "../utils/withTimeout";
import { whatsAppPayloadSchema } from "../validators/webhook.validator";

export function extractInboundMessages(payload: unknown): InboundMessageJob[] {
  const parsed = whatsAppPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    console.warn("Ignoring a WhatsApp webhook we don't understand");
    return [];
  }

  const jobs: InboundMessageJob[] = [];

  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;

      for (const message of change.value.messages ?? []) {
        jobs.push({
          waMessageId: message.id,
          phoneNumberId: change.value.metadata.phone_number_id,
          from: message.from,
          type: message.type,
          text: message.text?.body ?? null,
          timestamp: message.timestamp,
        });
      }
    }
  }

  return jobs;
}

export async function enqueueInboundMessages(payload: unknown) {
  const jobs = extractInboundMessages(payload);

  await withTimeout(Promise.all(jobs.map(addInboundMessage)), 3000);

  return jobs.length;
}