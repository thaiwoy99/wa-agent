import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const tokenSchema = z.object({
  sub: z.string(),
  vendorId: z.string(),
  role: z.enum(["owner", "staff"]),
});

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "Please log in");
  }

  const token = header.slice("Bearer ".length);

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new AppError(401, "Your login is invalid or has expired");
  }

  const result = tokenSchema.safeParse(payload);
  if (!result.success) {
    throw new AppError(401, "Your login is invalid or has expired");
  }

  req.auth = {
    userId: result.data.sub,
    vendorId: result.data.vendorId,
    role: result.data.role,
  };

  next();
};