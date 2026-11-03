import { Router } from "express";
import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../controllers/product.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import {
  createProductSchema,
  productIdSchema,
  updateProductSchema,
} from "../validators/product.validator";

export const productRouter = Router();

productRouter.use(requireAuth);

productRouter.get("/", listProducts);
productRouter.get("/:id", validate(productIdSchema, "params"), getProduct);
productRouter.post("/", validate(createProductSchema), createProduct);
productRouter.patch(
  "/:id",
  validate(productIdSchema, "params"),
  validate(updateProductSchema),
  updateProduct,
);