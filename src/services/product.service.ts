import * as productModel from "../models/product.model";
import { AppError } from "../utils/AppError";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "../validators/product.validator";

export function listProducts(vendorId: string) {
  return productModel.findProducts(vendorId);
}

export async function getProduct(vendorId: string, id: string) {
  const product = await productModel.findProductById(vendorId, id);
  if (!product) {
    throw new AppError(404, "Product not found");
  }
  return product;
}

export function createProduct(vendorId: string, input: CreateProductInput) {
  return productModel.createProduct(vendorId, input);
}

export async function updateProduct(
  vendorId: string,
  id: string,
  input: UpdateProductInput,
) {
  const count = await productModel.updateProduct(vendorId, id, input);
  if (count === 0) {
    throw new AppError(404, "Product not found");
  }
  return getProduct(vendorId, id);
}