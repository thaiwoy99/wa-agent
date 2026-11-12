import request from "supertest";
import { app } from "../src/app";
import crypto from "node:crypto";

export async function createVendorAndLogin(name: string) {
  const email = `${name}@example.com`;
  const password = "secret123";

  await request(app).post("/auth/signup").send({
    businessName: `${name} shop`,
    waPhoneNumberId: `wa-${name}`,
    email,
    password,
  });

  const res = await request(app).post("/auth/login").send({ email, password });

  return { Authorization: `Bearer ${res.body.token}` };
}

export function sign(body: string, secret = process.env.WHATSAPP_APP_SECRET!) {
  const hash = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hash}`;
}

export function textMessagePayload(waMessageId: string, text: string) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "2348000000000",
                phone_number_id: "wa-vendor-a",
              },
              contacts: [{ profile: { name: "Ada" }, wa_id: "2348011111111" }],
              messages: [
                {
                  from: "2348011111111",
                  id: waMessageId,
                  timestamp: "1762850000",
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
}