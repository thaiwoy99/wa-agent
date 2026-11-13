import { prisma } from "../config/db";
import { Prisma, type Vendor } from "../generated/prisma/client";

type InboundInput = {
  waMessageId: string;
  from: string;
  body: string;
};

export function findMessageByWaId(waMessageId: string) {
  return prisma.message.findUnique({ where: { waMessageId } });
}

export async function saveInboundMessage(vendor: Vendor, input: InboundInput) {
  const existing = await findMessageByWaId(input.waMessageId);
  if (existing) return existing;

  try {
    return await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: {
          vendorId_waNumber: { vendorId: vendor.id, waNumber: input.from },
        },
        create: {
          vendorId: vendor.id,
          waNumber: input.from,
          language: vendor.defaultLanguage,
        },
        update: {},
      });

      const conversation = await tx.conversation.upsert({
        where: { customerId: customer.id },
        create: { vendorId: vendor.id, customerId: customer.id },
        update: { lastMessageAt: new Date() },
      });

      return tx.message.create({
        data: {
          vendorId: vendor.id,
          conversationId: conversation.id,
          direction: "inbound",
          waMessageId: input.waMessageId,
          body: input.body,
        },
      });
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const saved = await findMessageByWaId(input.waMessageId);
      if (saved) return saved;
    }
    throw err;
  }
}

type ReplyInput = {
  vendorId: string;
  conversationId: string;
  inboundMessageId: string;
  waMessageId: string;
  body: string;
};

export function saveReply(input: ReplyInput) {
  const now = new Date();

  return prisma.$transaction([
    prisma.message.create({
      data: {
        vendorId: input.vendorId,
        conversationId: input.conversationId,
        direction: "outbound",
        waMessageId: input.waMessageId,
        body: input.body,
      },
    }),
    prisma.message.update({
      where: { id: input.inboundMessageId },
      data: { repliedAt: now },
    }),
    prisma.conversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: now },
    }),
  ]);
}