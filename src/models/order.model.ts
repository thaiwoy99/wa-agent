import { prisma } from "../config/db";
import { Prisma } from "../generated/prisma/client";
import * as productModel from "./product.model";

export type OrderLine = {
  productName: string;
  quantity: number;
};

type CreateOrderInput = {
  vendorId: string;
  customerId: string;
  sourceMessageId: string;
  lines: OrderLine[];
};

class OrderProblem extends Error {}

function findOrderByMessage(sourceMessageId: string) {
  return prisma.order.findUnique({
    where: { sourceMessageId },
    include: { items: { include: { product: true } } },
  });
}

export async function createOrder(input: CreateOrderInput) {
  const existing = await findOrderByMessage(input.sourceMessageId);
  if (existing) {
    return { ok: true as const, order: existing };
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      let totalKobo = 0;
      const items: { productId: string; quantity: number; unitPriceKobo: number }[] = [];

      for (const line of input.lines) {
        const product = await tx.product.findFirst({
          where: {
            vendorId: input.vendorId,
            isActive: true,
            name: { equals: line.productName, mode: "insensitive" },
          },
        });

        if (!product) {
          throw new OrderProblem(`We don't sell "${line.productName}".`);
        }

        const reserved = await productModel.reserveStock(
          tx,
          input.vendorId,
          product.id,
          line.quantity,
        );

        if (!reserved) {
          throw new OrderProblem(
            `Sorry, we only have ${product.stockQty} ${product.name} left.`,
          );
        }

        totalKobo += product.priceKobo * line.quantity;
        items.push({
          productId: product.id,
          quantity: line.quantity,
          unitPriceKobo: product.priceKobo,
        });
      }

      return tx.order.create({
        data: {
          vendorId: input.vendorId,
          customerId: input.customerId,
          sourceMessageId: input.sourceMessageId,
          totalKobo,
          items: { create: items },
        },
        include: { items: { include: { product: true } } },
      });
    });

    return { ok: true as const, order };
  } catch (err) {
    if (err instanceof OrderProblem) {
      return { ok: false as const, reason: err.message };
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const saved = await findOrderByMessage(input.sourceMessageId);
      if (saved) return { ok: true as const, order: saved };
    }

    throw err;
  }
}