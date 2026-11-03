import type { RequestHandler } from "express";
import { z } from "zod";

export function validate(
  schema: z.ZodType,
  source: "body" | "params" = "body",
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: z.flattenError(result.error),
      });
      return;
    }

    if (source === "body") {
      req.body = result.data;
    }
    next();
  };
}