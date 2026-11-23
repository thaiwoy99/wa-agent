import { env } from "../config/env";
import type { AiService } from "./aiService";
import { fakeAi } from "./fakeAi";
import { createGroqAi } from "./groqAi";

export function createAi(): AiService {
  if (!env.GROQ_API_KEY) {
    console.warn("No GROQ_API_KEY set. Using the fake AI.");
    return fakeAi;
  }

  console.log(`Using Groq AI (model: ${env.AI_MODEL})`);
  return createGroqAi({
    apiKey: env.GROQ_API_KEY,
    model: env.AI_MODEL,
  });
}