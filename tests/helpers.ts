import request from "supertest";
import { app } from "../src/app";

export async function createVendorAndLogin(name: string) {
  const email = `${name}@example.com`;
  const password = "secret123";

  await request(app).post("/auth/signup").send({
    businessName: `${name} shop`,
    waPhoneNumberId: `wa-${name}`,
    email,
    password,
  });

  const res = await request(app).post("/auth/login").send({ email, password });

  return { Authorization: `Bearer ${res.body.token}` };
}