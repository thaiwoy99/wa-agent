import type { AiService } from "../ai/aiService";
import { toChatMessages } from "../ai/history";
import { createTools } from "../ai/tools";
import type { MessageSender } from "../messaging/sender";
import * as messageModel from "../models/message.model";
import * as vendorModel from "../models/vendor.model";
import type { InboundMessageJob } from "../queues/inbound.queue";

export const TEXT_ONLY_REPLY = "Sorry, I can only read text messages for now.";

export async function handleInboundMessage(
  job: InboundMessageJob,
  sender: MessageSender,
  ai: AiService,
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

  let replyText: string;

  if (job.type !== "text") {
    replyText = TEXT_ONLY_REPLY;
  } else {
    const recentMessages = await messageModel.findRecentMessages(inbound.conversationId);
    replyText = await ai.generateReply({
      history: toChatMessages(recentMessages),
      tools: createTools(vendor.id),
    });
  }

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