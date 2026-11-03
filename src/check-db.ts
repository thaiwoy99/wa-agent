import { prisma } from "./config/db";

async function main() {
  const count = await prisma.vendor.count();
  console.log(`Connected. Vendors in database: ${count}`);
}

main()
  .catch((err) => {
    console.error("Database check failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());