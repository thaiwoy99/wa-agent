import express, { Router } from "express";
import { receiveWebhook, verifyWebhook } from "../controllers/webhook.controller";
import { verifyWhatsAppSignature } from "../middleware/verifyWhatsAppSignature";

export const webhookRouter = Router();

webhookRouter.get("/whatsapp", verifyWebhook);
webhookRouter.post(
  "/whatsapp",
  express.raw({ type: "application/json" }),
  verifyWhatsAppSignature,
  receiveWebhook,
);