import "dotenv/config";
import crypto from "node:crypto";

const text = process.argv[2] ?? "Hello";
const waMessageId = process.argv[3] ?? `wamid.TEST-${Date.now()}`;
const phoneNumberId = process.argv[4] ?? "test-123";

const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: phoneNumberId },
            messages: [
              {
                id: waMessageId,
                from: "2348011111111",
                timestamp: String(Math.floor(Date.now() / 1000)),
                type: "text",
                text: { body: text },
              },
            ],
          },
        },
      ],
    },
  ],
};

const body = JSON.stringify(payload);
const signature =
  "sha256=" +
  crypto
    .createHmac("sha256", process.env.WHATSAPP_APP_SECRET!)
    .update(body)
    .digest("hex");

const port = process.env.PORT ?? "3000";

fetch(`http://localhost:${port}/webhooks/whatsapp`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Hub-Signature-256": signature,
  },
  body,
}).then((res) => {
  console.log(`Sent "${text}" (id ${waMessageId}) -> ${res.status}`);
});