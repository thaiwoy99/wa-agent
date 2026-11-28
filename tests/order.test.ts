import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db";
import { createOrder } from "../src/models/order.model";

describe("createOrder", () => {
  let vendorId: string;
  let customerId: string;
  let conversationId: string;
  let friedRiceId: string;

  beforeEach(async () => {
    const vendor = await prisma.vendor.create({
      data: { name: "Mama Tunde Foods", waPhoneNumberId: "wa-order-test" },
    });
    const customer = await prisma.customer.create({
      data: { vendorId: vendor.id, waNumber: "2348011111111" },
    });
    const conversation = await prisma.conversation.create({
      data: { vendorId: vendor.id, customerId: customer.id },
    });
    const friedRice = await prisma.product.create({
      data: { vendorId: vendor.id, name: "Fried Rice", priceKobo: 180000, stockQty: 3 },
    });
    await prisma.product.create({
      data: { vendorId: vendor.id, name: "Jollof Rice", priceKobo: 150000, stockQty: 0 },
    });

    vendorId = vendor.id;
    customerId = customer.id;
    conversationId = conversation.id;
    friedRiceId = friedRice.id;
  });

  async function newCustomerMessage() {
    return prisma.message.create({
      data: { vendorId, conversationId, direction: "inbound", body: "I want to order" },
    });
  }

  async function friedRiceStock() {
    const product = await prisma.product.findUnique({ where: { id: friedRiceId } });
    return product?.stockQty;
  }

  it("creates an order with prices from the database", async () => {
    const message = await newCustomerMessage();

    const result = await createOrder({
      vendorId,
      customerId,
      sourceMessageId: message.id,
      lines: [{ productName: "fried rice", quantity: 2 }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.totalKobo).toBe(360000);
    expect(result.order.items[0]?.unitPriceKobo).toBe(180000);
    expect(await friedRiceStock()).toBe(1);
  });

  it("returns the same order when the same message runs twice", async () => {
    const message = await newCustomerMessage();
    const input = {
      vendorId,
      customerId,
      sourceMessageId: message.id,
      lines: [{ productName: "Fried Rice", quantity: 2 }],
    };

    const first = await createOrder(input);
    const second = await createOrder(input);

    expect(first.ok && second.ok && first.order.id === second.order.id).toBe(true);
    expect(await prisma.order.count()).toBe(1);
    expect(await friedRiceStock()).toBe(1);
  });

  it("saves nothing if one item is sold out (all or nothing)", async () => {
    const message = await newCustomerMessage();

    const result = await createOrder({
      vendorId,
      customerId,
      sourceMessageId: message.id,
      lines: [
        { productName: "Fried Rice", quantity: 2 },
        { productName: "Jollof Rice", quantity: 1 },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("Jollof Rice");
    expect(await friedRiceStock()).toBe(3);
    expect(await prisma.order.count()).toBe(0);
  });

  it("refuses a product the shop doesn't sell", async () => {
    const message = await newCustomerMessage();

    const result = await createOrder({
      vendorId,
      customerId,
      sourceMessageId: message.id,
      lines: [{ productName: "Chapman", quantity: 1 }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("Chapman");
  });

  it("gives the last plates to only one of two orders at the same time", async () => {
    const adaMessage = await newCustomerMessage();
    const bolaMessage = await newCustomerMessage();
    const lines = [{ productName: "Fried Rice", quantity: 2 }];

    const [ada, bola] = await Promise.all([
      createOrder({ vendorId, customerId, sourceMessageId: adaMessage.id, lines }),
      createOrder({ vendorId, customerId, sourceMessageId: bolaMessage.id, lines }),
    ]);

    expect([ada.ok, bola.ok].filter(Boolean)).toHaveLength(1);
    expect(await friedRiceStock()).toBe(1);
  });

  it("creates only one order when the same message runs twice at the same time", async () => {
    const message = await newCustomerMessage();
    const input = {
      vendorId,
      customerId,
      sourceMessageId: message.id,
      lines: [{ productName: "Fried Rice", quantity: 1 }],
    };

    const [first, second] = await Promise.all([createOrder(input), createOrder(input)]);

    expect(first.ok && second.ok && first.order.id === second.order.id).toBe(true);
    expect(await prisma.order.count()).toBe(1);
    expect(await friedRiceStock()).toBe(2);
  });
});