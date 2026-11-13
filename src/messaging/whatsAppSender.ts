import { z } from "zod";
import type { MessageSender } from "./sender";
import { PermanentSendError, TemporarySendError } from "./sendErrors";

const RATE_LIMIT_CODES = new Set([4, 80007, 130429, 131056]);

const successSchema = z.object({
  messages: z.array(z.object({ id: z.string() })).min(1),
});

const errorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.number().optional(),
  }),
});

type WhatsAppSenderConfig = {
  accessToken: string;
  apiVersion: string;
  timeoutMs?: number;
};

export function createWhatsAppSender(config: WhatsAppSenderConfig): MessageSender {
  return {
    async sendText({ phoneNumberId, to, text }) {
      const url = `https://graph.facebook.com/${config.apiVersion}/${phoneNumberId}/messages`;

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { body: text },
          }),
          signal: AbortSignal.timeout(config.timeoutMs ?? 10_000),
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new TemporarySendError(`Could not reach WhatsApp: ${reason}`);
      }

      const body: unknown = await res.json().catch(() => null);

      if (res.ok) {
        const parsed = successSchema.safeParse(body);
        if (!parsed.success) {
          throw new TemporarySendError("WhatsApp sent an unexpected response");
        }
        return { waMessageId: parsed.data.messages[0]!.id };
      }

      const parsedError = errorSchema.safeParse(body);
      const message = parsedError.success
        ? parsedError.data.error.message
        : `HTTP ${res.status}`;
      const code = parsedError.success ? parsedError.data.error.code : undefined;

      const isTemporary =
        res.status >= 500 ||
        res.status === 429 ||
        (code !== undefined && RATE_LIMIT_CODES.has(code));

      if (isTemporary) {
        throw new TemporarySendError(`WhatsApp error ${res.status}: ${message}`);
      }

      throw new PermanentSendError(`WhatsApp error ${res.status}: ${message}`);
    },
  };
}