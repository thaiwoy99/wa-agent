import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/config/db";
import { inboundQueue } from "../src/queues/inbound.queue";

if (!process.env.DATABASE_URL?.includes("wa_agent_test")) {
  throw new Error("STOP: tests must use the wa_agent_test database. Check .env.test");
}

if (!process.env.REDIS_URL?.endsWith("/1")) {
  throw new Error("STOP: tests must use Redis database 1. Check .env.test");
}

beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE messages, conversations, order_items, orders, customers, products, users, vendors CASCADE`;
  await inboundQueue.obliterate({ force: true });
});

afterAll(async () => {
  await inboundQueue.close();
  await prisma.$disconnect();
});