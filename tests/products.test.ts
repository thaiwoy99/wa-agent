import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { createVendorAndLogin } from "./helpers";

describe("products", () => {
  let auth: { Authorization: string };

  beforeEach(async () => {
    auth = await createVendorAndLogin("vendor-a");
  });

  it("creates and lists a product", async () => {
    const created = await request(app)
      .post("/products")
      .set(auth)
      .send({ name: "Jollof Rice", priceKobo: 150000, stockQty: 20 });

    expect(created.status).toBe(201);
    expect(created.body.product.isActive).toBe(true);

    const list = await request(app).get("/products").set(auth);

    expect(list.body.products).toHaveLength(1);
    expect(list.body.products[0].name).toBe("Jollof Rice");
  });

  it("updates the price and hides a product", async () => {
    const created = await request(app)
      .post("/products")
      .set(auth)
      .send({ name: "Jollof Rice", priceKobo: 150000 });
    const id = created.body.product.id;

    const res = await request(app)
      .patch(`/products/${id}`)
      .set(auth)
      .send({ priceKobo: 175000, isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.product.priceKobo).toBe(175000);
    expect(res.body.product.isActive).toBe(false);
  });

  it("rejects a price with decimals", async () => {
    const res = await request(app)
      .post("/products")
      .set(auth)
      .send({ name: "Jollof Rice", priceKobo: 1500.5 });

    expect(res.status).toBe(400);
  });

  it("rejects an id that is not a UUID", async () => {
    const res = await request(app).get("/products/abc").set(auth);

    expect(res.status).toBe(400);
  });

  it("blocks a request with no token", async () => {
    const res = await request(app).get("/products");

    expect(res.status).toBe(401);
  });
});