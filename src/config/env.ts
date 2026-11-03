import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);