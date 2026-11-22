import type { Message } from "../generated/prisma/client";
import type { ChatMessage } from "./aiService";

export function toChatMessages(messages: Message[]): ChatMessage[] {
  return messages.map((m) => ({
    role: m.direction === "inbound" ? "customer" : "assistant",
    text: m.body,
  }));
}