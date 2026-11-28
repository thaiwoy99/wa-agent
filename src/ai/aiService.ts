export type ChatMessage = {
  role: "customer" | "assistant";
  text: string;
};

export type Tool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run: (input: unknown) => Promise<string>;
};

export interface AiService {
  generateReply(input: {
    history: ChatMessage[];
    tools: Tool[];
  }): Promise<string>;
}