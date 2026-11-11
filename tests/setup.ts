import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/config/db";

if (!process.env.DATABASE_URL?.includes("wa_agent_test")) {
  throw new Error("STOP: tests must use the wa_agent_test database. Check .env.test");
}

beforeEach(async () => {
await prisma.$executeRaw`TRUNCATE TABLE messages, conversations, order_items, orders, customers, products, users, vendors CASCADE`;});

afterAll(async () => {
  await prisma.$disconnect();
});