import { afterEach, describe, expect, it, vi } from "vitest";
import { PermanentSendError, TemporarySendError } from "../src/messaging/sendErrors";
import { createWhatsAppSender } from "../src/messaging/whatsAppSender";

const sender = createWhatsAppSender({
  accessToken: "test-token",
  apiVersion: "v26.0",
});

const message = {
  phoneNumberId: "123456",
  to: "2348011111111",
  text: "Hello Ada",
};

function fakeResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("WhatsApp sender", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the right request and returns the message id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      fakeResponse(200, {
        messaging_product: "whatsapp",
        contacts: [{ input: "2348011111111", wa_id: "2348011111111" }],
        messages: [{ id: "wamid.REPLY1" }],
      }),
    );

    const result = await sender.sendText(message);

    expect(result).toEqual({ waMessageId: "wamid.REPLY1" });

    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://graph.facebook.com/v26.0/123456/messages");
    expect(options?.method).toBe("POST");
    expect(options?.headers).toMatchObject({ Authorization: "Bearer test-token" });
    expect(JSON.parse(options?.body as string)).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "2348011111111",
      type: "text",
      text: { body: "Hello Ada" },
    });
  });

  it("treats a server error as temporary", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      fakeResponse(503, { error: { message: "Service unavailable", code: 2 } }),
    );

    await expect(sender.sendText(message)).rejects.toBeInstanceOf(TemporarySendError);
  });

  it("treats a rate limit as temporary", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      fakeResponse(400, { error: { message: "Too many messages", code: 130429 } }),
    );

    await expect(sender.sendText(message)).rejects.toBeInstanceOf(TemporarySendError);
  });

  it("treats a bad token as permanent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      fakeResponse(401, { error: { message: "Invalid OAuth access token", code: 190 } }),
    );

    await expect(sender.sendText(message)).rejects.toBeInstanceOf(PermanentSendError);
  });

  it("treats a network failure as temporary", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    await expect(sender.sendText(message)).rejects.toBeInstanceOf(TemporarySendError);
  });

  it("treats an unexpected success response as temporary", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(fakeResponse(200, { weird: true }));

    await expect(sender.sendText(message)).rejects.toBeInstanceOf(TemporarySendError);
  });
});