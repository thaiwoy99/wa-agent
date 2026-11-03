import type { Request, Response } from "express";
import * as productService from "../services/product.service";

export async function listProducts(req: Request, res: Response) {
  const products = await productService.listProducts(req.auth!.vendorId);
  res.json({ products });
}

export async function getProduct(req: Request<{ id: string }>, res: Response) {
  const product = await productService.getProduct(
    req.auth!.vendorId,
    req.params.id,
  );
  res.json({ product });
}

export async function createProduct(req: Request, res: Response) {
  const product = await productService.createProduct(
    req.auth!.vendorId,
    req.body,
  );
  res.status(201).json({ product });
}

export async function updateProduct(
  req: Request<{ id: string }>,
  res: Response,
) {
  const product = await productService.updateProduct(
    req.auth!.vendorId,
    req.params.id,
    req.body,
  );
  res.json({ product });
}