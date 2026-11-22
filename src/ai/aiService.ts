export type ChatMessage = {
  role: "customer" | "assistant";
  text: string;
};

export type Tool = {
  name: string;
  description: string;
  run: () => Promise<string>;
};

export interface AiService {
  generateReply(input: {
    history: ChatMessage[];
    tools: Tool[];
  }): Promise<string>;
}