import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

const newVendor = {
  businessName: "Mama Tunde Foods",
  waPhoneNumberId: "test-123",
  email: "  Owner@Example.COM ",
  password: "secret123",
};

describe("POST /auth/signup", () => {
  it("creates a vendor and an owner", async () => {
    const res = await request(app).post("/auth/signup").send(newVendor);

    expect(res.status).toBe(201);
    expect(res.body.vendor.name).toBe("Mama Tunde Foods");
    expect(res.body.user.role).toBe("owner");
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("rejects a duplicate email with 409", async () => {
    await request(app).post("/auth/signup").send(newVendor);

    const res = await request(app).post("/auth/signup").send(newVendor);

    expect(res.status).toBe(409);
  });

  it("rejects bad data with 400", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "bad", password: "1" });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("returns a token for the right password", async () => {
    await request(app).post("/auth/signup").send(newVendor);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "Owner@Example.com", password: "secret123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("gives the same 401 for a wrong password and an unknown email", async () => {
    await request(app).post("/auth/signup").send(newVendor);

    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ email: "owner@example.com", password: "wrongpass" });
    const unknownEmail = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "secret123" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });
});

describe("GET /auth/me", () => {
  it("blocks a request with no token", async () => {
    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(401);
  });
});