import { prisma } from "../config/db";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "../validators/product.validator";

export function findProducts(vendorId: string) {
  return prisma.product.findMany({
    where: { vendorId },
    orderBy: { createdAt: "desc" },
  });
}

export function findProductById(vendorId: string, id: string) {
  return prisma.product.findFirst({
    where: { id, vendorId },
  });
}

export function createProduct(vendorId: string, data: CreateProductInput) {
  return prisma.product.create({
    data: { ...data, vendorId },
  });
}

export async function updateProduct(
  vendorId: string,
  id: string,
  data: UpdateProductInput,
) {
  const result = await prisma.product.updateMany({
    where: { id, vendorId },
    data,
  });
  return result.count;
}