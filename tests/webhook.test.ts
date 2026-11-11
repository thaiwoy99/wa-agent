import crypto from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

function sign(body: string, secret = process.env.WHATSAPP_APP_SECRET!) {
  const hash = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hash}`;
}

describe("GET /webhooks/whatsapp (Meta's URL check)", () => {
  it("returns the challenge when the token is right", async () => {
    const res = await request(app).get("/webhooks/whatsapp").query({
      "hub.mode": "subscribe",
      "hub.verify_token": process.env.WHATSAPP_VERIFY_TOKEN,
      "hub.challenge": "12345",
    });

    expect(res.status).toBe(200);
    expect(res.text).toBe("12345");
  });

  it("refuses a wrong token", async () => {
    const res = await request(app).get("/webhooks/whatsapp").query({
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong-token",
      "hub.challenge": "12345",
    });

    expect(res.status).toBe(403);
  });
});

describe("POST /webhooks/whatsapp (signature check)", () => {
  const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });

  it("accepts a request with a correct signature", async () => {
    const res = await request(app)
      .post("/webhooks/whatsapp")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", sign(body))
      .send(body);

    expect(res.status).toBe(200);
  });

  it("rejects a request with no signature", async () => {
    const res = await request(app)
      .post("/webhooks/whatsapp")
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(401);
  });

  it("rejects a signature made with the wrong secret", async () => {
    const res = await request(app)
      .post("/webhooks/whatsapp")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", sign(body, "attacker-secret"))
      .send(body);

    expect(res.status).toBe(401);
  });

  it("rejects a body that was changed after signing", async () => {
    const changed = body.replace("[]", '[{"fake":true}]');

    const res = await request(app)
      .post("/webhooks/whatsapp")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", sign(body))
      .send(changed);

    expect(res.status).toBe(401);
  });
});