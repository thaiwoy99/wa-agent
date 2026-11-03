import { z } from "zod";

export const signupSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  waPhoneNumberId: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;