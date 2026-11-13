import { env } from "../config/env";
import { consoleSender } from "./consoleSender";
import type { MessageSender } from "./sender";
import { createWhatsAppSender } from "./whatsAppSender";

export function createMessageSender(): MessageSender {
  if (!env.WHATSAPP_ACCESS_TOKEN) {
    console.warn("No WHATSAPP_ACCESS_TOKEN set. Replies will be printed, not sent.");
    return consoleSender;
  }

  return createWhatsAppSender({
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    apiVersion: env.WHATSAPP_API_VERSION,
  });
}