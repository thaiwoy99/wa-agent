import crypto from "node:crypto";
import type { MessageSender } from "./sender";

export const consoleSender: MessageSender = {
  async sendText(message) {
    console.log(`[console sender] to ${message.to}: ${message.text}`);
    return { waMessageId: `console.${crypto.randomUUID()}` };
  },
};