import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/AppError";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};