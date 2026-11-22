import * as productModel from "../models/product.model";
import { formatNaira } from "../utils/money";
import type { Tool } from "./aiService";

export function createTools(vendorId: string): Tool[] {
  const listProducts: Tool = {
    name: "list_products",
    description:
      "Get the shop's products with their prices and stock. Use this before answering any question about products, prices or availability.",
    run: async () => {
      const products = await productModel.findActiveProducts(vendorId);

      if (products.length === 0) {
        return "The shop has no products available right now.";
      }

      return products
        .map((p) => {
          const stock = p.stockQty > 0 ? `${p.stockQty} in stock` : "sold out";
          return `- ${p.name}: ${formatNaira(p.priceKobo)} (${stock})`;
        })
        .join("\n");
    },
  };

  return [listProducts];
}