import { z } from "zod";
import type { AiService, Tool } from "./aiService";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_ROUNDS = 5;

export const FALLBACK_REPLY =
  "Sorry, I'm having a small problem right now. Please try again in a moment.";

const SYSTEM_PROMPT = `You are the friendly WhatsApp assistant for a small food shop in Nigeria.
Rules:
- For any question about products, prices or availability, ALWAYS use the list_products tool first.
- Only mention products, prices and stock that the tool returned. Never guess or invent them.
- If the customer asks for something the shop does not sell, say so politely and suggest what is available.
- Reply in the same language the customer uses (English or Nigerian Pidgin).
- Keep replies short: 1 to 3 sentences.`;

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type GroqMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
          tool_calls: z
            .array(
              z.object({
                id: z.string(),
                function: z.object({ name: z.string(), arguments: z.string() }),
              }),
            )
            .optional(),
        }),
      }),
    )
    .min(1),
});

type GroqAiConfig = {
  apiKey: string;
  model: string;
  timeoutMs?: number;
};

function parseArguments(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return null;
  }
}

export function createGroqAi(config: GroqAiConfig): AiService {
  async function askGroq(messages: GroqMessage[], tools: Tool[]) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        include_reasoning: false,
        messages,
        tools: tools.map((t) => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
      }),
      signal: AbortSignal.timeout(config.timeoutMs ?? 20_000),
    });

    if (!res.ok) {
      throw new Error(`Groq error ${res.status}: ${await res.text()}`);
    }

    const parsed = responseSchema.safeParse(await res.json());
    if (!parsed.success) {
      throw new Error("Groq sent an unexpected response");
    }

    return parsed.data.choices[0]!.message;
  }

  return {
    async generateReply({ history, tools }) {
      const messages: GroqMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((m): GroqMessage =>
          m.role === "customer"
            ? { role: "user", content: m.text }
            : { role: "assistant", content: m.text },
        ),
      ];

      for (let round = 1; round <= MAX_ROUNDS; round++) {
        const answer = await askGroq(messages, tools);
        const toolCalls = answer.tool_calls ?? [];

        if (toolCalls.length === 0) {
          return answer.content?.trim() || FALLBACK_REPLY;
        }

        messages.push({
          role: "assistant",
          content: answer.content ?? null,
          tool_calls: toolCalls.map((c) => ({ ...c, type: "function" })),
        });

        for (const call of toolCalls) {
          const tool = tools.find((t) => t.name === call.function.name);
          const result = tool
            ? await tool.run(parseArguments(call.function.arguments))
            : `There is no tool called ${call.function.name}.`;

          messages.push({ role: "tool", tool_call_id: call.id, content: result });
        }
      }

      return FALLBACK_REPLY;
    },
  };
}