import express from "express";
import { authRouter } from "./routes/auth.routes";
import { productRouter } from "./routes/product.routes";
import { webhookRouter } from "./routes/webhook.routes";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();


// Must come BEFORE express.json(): the signature check needs the raw body.

app.use("/webhooks", webhookRouter);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/products", productRouter);

app.use(errorHandler);