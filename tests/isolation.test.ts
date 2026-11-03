import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/config/db";
import { createVendorAndLogin } from "./helpers";

describe("vendor isolation", () => {
  let authA: { Authorization: string };
  let authB: { Authorization: string };
  let productId: string;

  beforeEach(async () => {
    authA = await createVendorAndLogin("vendor-a");
    authB = await createVendorAndLogin("vendor-b");

    const created = await request(app)
      .post("/products")
      .set(authA)
      .send({ name: "Jollof Rice", priceKobo: 150000 });
    productId = created.body.product.id;
  });

  it("vendor B cannot see vendor A's product in the list", async () => {
    const res = await request(app).get("/products").set(authB);

    expect(res.body.products).toHaveLength(0);
  });

  it("vendor B gets 404 when reading vendor A's product", async () => {
    const res = await request(app).get(`/products/${productId}`).set(authB);

    expect(res.status).toBe(404);
  });

  it("vendor B cannot change vendor A's product", async () => {
    const res = await request(app)
      .patch(`/products/${productId}`)
      .set(authB)
      .send({ priceKobo: 1 });

    expect(res.status).toBe(404);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.priceKobo).toBe(150000);
  });
});