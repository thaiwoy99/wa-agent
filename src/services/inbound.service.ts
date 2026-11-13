import type { MessageSender } from "../messaging/sender";
import * as messageModel from "../models/message.model";
import * as vendorModel from "../models/vendor.model";
import type { InboundMessageJob } from "../queues/inbound.queue";

export const TEXT_ONLY_REPLY = "Sorry, I can only read text messages for now.";
export const RECEIVED_REPLY = "Thanks, we got your message! We'll reply soon.";

export async function handleInboundMessage(
  job: InboundMessageJob,
  sender: MessageSender,
) {
  const vendor = await vendorModel.findVendorByPhoneNumberId(job.phoneNumberId);
  if (!vendor) {
    console.warn(`No vendor for phone number id ${job.phoneNumberId}. Skipping.`);
    return;
  }

  const inbound = await messageModel.saveInboundMessage(vendor, {
    waMessageId: job.waMessageId,
    from: job.from,
    body: job.text ?? `[${job.type}]`,
  });

  if (inbound.repliedAt) {
    return;
  }

  const replyText = job.type === "text" ? RECEIVED_REPLY : TEXT_ONLY_REPLY;

  const sent = await sender.sendText({
    phoneNumberId: job.phoneNumberId,
    to: job.from,
    text: replyText,
  });

  await messageModel.saveReply({
    vendorId: vendor.id,
    conversationId: inbound.conversationId,
    inboundMessageId: inbound.id,
    waMessageId: sent.waMessageId,
    body: replyText,
  });
}