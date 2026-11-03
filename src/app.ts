import express from "express";
import { authRouter } from "./routes/auth.routes";
import { productRouter } from "./routes/product.routes";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/products", productRouter);

app.use(errorHandler);