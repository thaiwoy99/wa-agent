import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app";
import { inboundQueue } from "../src/queues/inbound.queue";
import { sign, textMessagePayload } from "./helpers";


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


describe("POST /webhooks/whatsapp (adding jobs to the queue)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function postSigned(payload: unknown) {
    const body = JSON.stringify(payload);
    return request(app)
      .post("/webhooks/whatsapp")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", sign(body))
      .send(body);
  }

  it("puts a text message in the queue", async () => {
    const res = await postSigned(textMessagePayload("wamid.TEST1", "How much is jollof?"));

    expect(res.status).toBe(200);

    const job = await inboundQueue.getJob("wamid.TEST1");
    expect(job?.data).toEqual({
      waMessageId: "wamid.TEST1",
      phoneNumberId: "wa-vendor-a",
      from: "2348011111111",
      type: "text",
      text: "How much is jollof?",
      timestamp: "1762850000",
    });
  });

  it("adds only one job when the same message arrives twice", async () => {
    const payload = textMessagePayload("wamid.TEST2", "Hello");

    await postSigned(payload);
    const second = await postSigned(payload);

    expect(second.status).toBe(200);
    expect(await inboundQueue.getJobCountByTypes("waiting")).toBe(1);
  });

  it("ignores status updates but still answers 200", async () => {
    const statusUpdate = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "wa-vendor-a" },
                statuses: [{ id: "wamid.OUT1", status: "delivered" }],
              },
            },
          ],
        },
      ],
    };

    const res = await postSigned(statusUpdate);

    expect(res.status).toBe(200);
    expect(await inboundQueue.getJobCountByTypes("waiting")).toBe(0);
  });

  it("answers 200 to a payload it doesn't understand", async () => {
    const res = await postSigned({ something: "unexpected" });

    expect(res.status).toBe(200);
    expect(await inboundQueue.getJobCountByTypes("waiting")).toBe(0);
  });

  it("answers 500 when the queue fails, so Meta will retry", async () => {
    vi.spyOn(inboundQueue, "add").mockRejectedValue(new Error("Redis is down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await postSigned(textMessagePayload("wamid.TEST3", "Hello"));

    expect(res.status).toBe(500);
  });
});