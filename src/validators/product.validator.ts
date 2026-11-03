import { z } from "zod";

const MAX_INT = 2_147_483_647;

export const productIdSchema = z.object({
  id: z.uuid(),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  priceKobo: z.number().int().positive().max(MAX_INT),
  stockQty: z.number().int().min(0).max(MAX_INT).default(0),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    priceKobo: z.number().int().positive().max(MAX_INT),
    stockQty: z.number().int().min(0).max(MAX_INT),
    isActive: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Send at least one field to update",
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;