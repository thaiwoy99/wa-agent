import crypto from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

export const verifyWhatsAppSignature: RequestHandler = (req, res, next) => {
  const header = req.get("x-hub-signature-256");
  if (!header || !header.startsWith("sha256=")) {
    throw new AppError(401, "Missing signature");
  }

  if (!Buffer.isBuffer(req.body)) {
    throw new AppError(400, "Expected a raw body");
  }

  const received = header.slice("sha256=".length);
  const expected = crypto
    .createHmac("sha256", env.WHATSAPP_APP_SECRET)
    .update(req.body)
    .digest("hex");

  const receivedBuf = Buffer.from(received, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");

  const valid =
    receivedBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(receivedBuf, expectedBuf);

  if (!valid) {
    throw new AppError(401, "Invalid signature");
  }

  try {
    req.body = JSON.parse(req.body.toString("utf8"));
  } catch {
    throw new AppError(400, "Body is not valid JSON");
  }

  next();
};