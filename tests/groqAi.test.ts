import { afterEach, describe, expect, it, vi } from "vitest";
import type { Tool } from "../src/ai/aiService";
import { FALLBACK_REPLY, createGroqAi } from "../src/ai/groqAi";

const ai = createGroqAi({ apiKey: "test-key", model: "test-model" });

function groqText(text: string) {
  return new Response(
    JSON.stringify({ choices: [{ message: { role: "assistant", content: text } }] }),
    { status: 200 },
  );
}

function groqToolCall(name: string) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "call_1", type: "function", function: { name, arguments: "{}" } },
            ],
          },
        },
      ],
    }),
    { status: 200 },
  );
}

function fakeListProducts() {
  const tool: Tool = {
    name: "list_products",
    description: "Get products",
    run: vi.fn(async () => "- Fried Rice: ₦1,800 (12 in stock)"),
  };
  return tool;
}

describe("Groq AI", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a text reply directly when no tool is needed", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(groqText("Good morning! How can I help?"));

    const reply = await ai.generateReply({
      history: [{ role: "customer", text: "Good morning" }],
      tools: [fakeListProducts()],
    });

    expect(reply).toBe("Good morning! How can I help?");
  });

  it("runs the tool the AI asks for, then returns its final reply", async () => {
    const tool = fakeListProducts();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(groqToolCall("list_products"))
      .mockResolvedValueOnce(groqText("Fried rice na ₦1,800."));

    const reply = await ai.generateReply({
      history: [{ role: "customer", text: "How much fried rice?" }],
      tools: [tool],
    });

    expect(reply).toBe("Fried rice na ₦1,800.");
    expect(tool.run).toHaveBeenCalledTimes(1);

    const secondRequest = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    const lastMessage = secondRequest.messages.at(-1);
    expect(lastMessage).toEqual({
      role: "tool",
      tool_call_id: "call_1",
      content: "- Fried Rice: ₦1,800 (12 in stock)",
    });
  });

  it("stops after 5 rounds and sends the fallback reply", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => groqToolCall("list_products"));

    const reply = await ai.generateReply({
      history: [{ role: "customer", text: "Hello" }],
      tools: [fakeListProducts()],
    });

    expect(reply).toBe(FALLBACK_REPLY);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("throws when Groq fails, so the job is retried", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("busy", { status: 503 }));

    await expect(
      ai.generateReply({ history: [{ role: "customer", text: "Hi" }], tools: [] }),
    ).rejects.toThrow("Groq error 503");
  });
});