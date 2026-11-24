import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/config/db";
import { reserveStock } from "../src/models/product.model";
import { createVendorAndLogin } from "./helpers";

describe("reserveStock", () => {
  let vendorId: string;
  let productId: string;

  beforeEach(async () => {
    const auth = await createVendorAndLogin("vendor-a");
    const res = await request(app)
      .post("/products")
      .set(auth)
      .send({ name: "Fried Rice", priceKobo: 180000, stockQty: 3 });

    vendorId = res.body.product.vendorId;
    productId = res.body.product.id;
  });

  async function stockNow() {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    return product?.stockQty;
  }

  it("reserves stock when there is enough", async () => {
    const ok = await reserveStock(prisma, vendorId, productId, 2);

    expect(ok).toBe(true);
    expect(await stockNow()).toBe(1);
  });

  it("refuses and changes nothing when there is not enough", async () => {
    const ok = await reserveStock(prisma, vendorId, productId, 5);

    expect(ok).toBe(false);
    expect(await stockNow()).toBe(3);
  });

  it("gives the last plates to only one of two orders at the same time", async () => {
    const [ada, bola] = await Promise.all([
      reserveStock(prisma, vendorId, productId, 2),
      reserveStock(prisma, vendorId, productId, 2),
    ]);

    expect([ada, bola].filter(Boolean)).toHaveLength(1);
    expect(await stockNow()).toBe(1);
  });

  it("never reserves another vendor's product", async () => {
    const otherVendor = "00000000-0000-4000-8000-000000000000";

    const ok = await reserveStock(prisma, otherVendor, productId, 1);

    expect(ok).toBe(false);
    expect(await stockNow()).toBe(3);
  });
});