import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db";
import type { InboundMessageJob } from "../src/queues/inbound.queue";
import {
  RECEIVED_REPLY,
  TEXT_ONLY_REPLY,
  handleInboundMessage,
} from "../src/services/inbound.service";
import { createFakeSender, createVendorAndLogin } from "./helpers";

function textJob(waMessageId: string, text: string): InboundMessageJob {
  return {
    waMessageId,
    phoneNumberId: "wa-vendor-a",
    from: "2348011111111",
    type: "text",
    text,
    timestamp: "1762850000",
  };
}

describe("handleInboundMessage (the worker's job)", () => {
  beforeEach(async () => {
    await createVendorAndLogin("vendor-a");
  });

  it("saves the customer, conversation and message, and replies once", async () => {
    const sender = createFakeSender();

    await handleInboundMessage(textJob("wamid.IN1", "How much is jollof?"), sender);

    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]).toEqual({
      phoneNumberId: "wa-vendor-a",
      to: "2348011111111",
      text: RECEIVED_REPLY,
    });

    const customers = await prisma.customer.findMany();
    expect(customers).toHaveLength(1);
    expect(customers[0]?.waNumber).toBe("2348011111111");

    const inbound = await prisma.message.findUnique({ where: { waMessageId: "wamid.IN1" } });
    expect(inbound?.direction).toBe("inbound");
    expect(inbound?.body).toBe("How much is jollof?");
    expect(inbound?.repliedAt).not.toBeNull();

    const outbound = await prisma.message.findMany({ where: { direction: "outbound" } });
    expect(outbound).toHaveLength(1);
  });

  it("does nothing new when the same job runs twice", async () => {
    const sender = createFakeSender();
    const job = textJob("wamid.IN2", "Hello");

    await handleInboundMessage(job, sender);
    await handleInboundMessage(job, sender);

    expect(sender.sent).toHaveLength(1);
    expect(await prisma.message.count({ where: { direction: "inbound" } })).toBe(1);
  });

  it("keeps one customer and one conversation across several messages", async () => {
    const sender = createFakeSender();

    await handleInboundMessage(textJob("wamid.IN3", "Hello"), sender);
    await handleInboundMessage(textJob("wamid.IN4", "Are you open?"), sender);

    expect(await prisma.customer.count()).toBe(1);
    expect(await prisma.conversation.count()).toBe(1);
    expect(await prisma.message.count({ where: { direction: "inbound" } })).toBe(2);
  });

  it("skips a message for an unknown vendor", async () => {
    const sender = createFakeSender();
    const job = { ...textJob("wamid.IN5", "Hello"), phoneNumberId: "unknown-number" };

    await handleInboundMessage(job, sender);

    expect(sender.sent).toHaveLength(0);
    expect(await prisma.message.count()).toBe(0);
  });

  it("answers a photo with the text-only reply", async () => {
    const sender = createFakeSender();
    const photoJob: InboundMessageJob = {
      ...textJob("wamid.IN6", ""),
      type: "image",
      text: null,
    };

    await handleInboundMessage(photoJob, sender);

    expect(sender.sent[0]?.text).toBe(TEXT_ONLY_REPLY);
  });

  it("is safe to retry after sending fails", async () => {
    const job = textJob("wamid.IN7", "Hello");
    const brokenSender = {
      async sendText(): Promise<{ waMessageId: string }> {
        throw new Error("WhatsApp is down");
      },
    };

    await expect(handleInboundMessage(job, brokenSender)).rejects.toThrow("WhatsApp is down");

    const afterFailure = await prisma.message.findUnique({ where: { waMessageId: "wamid.IN7" } });
    expect(afterFailure?.repliedAt).toBeNull();

    const workingSender = createFakeSender();
    await handleInboundMessage(job, workingSender);

    expect(workingSender.sent).toHaveLength(1);
    expect(await prisma.message.count({ where: { direction: "inbound" } })).toBe(1);
  });
});