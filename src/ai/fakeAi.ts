import type { AiService } from "./aiService";

const PRODUCT_WORDS = ["price", "how much", "available", "menu", "have", "sell"];

function isAboutProducts(text: string): boolean {
  const lowerText = text.toLowerCase();
  return PRODUCT_WORDS.some((word) => lowerText.includes(word));
}

export const fakeAi: AiService = {
  async generateReply({ history, tools }) {
    const lastMessage = history[history.length - 1];
    const text = lastMessage?.text ?? "";

    if (isAboutProducts(text)) {
      const tool = tools.find((t) => t.name === "list_products");
      if (tool) {
        const result = await tool.run({});
        return `Here's what we have:\n${result}`;
      }
    }

    return "Hello! 👋 Ask me about our products and prices.";
  },
};