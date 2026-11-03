import { Router } from "express";
import { login, me, signup } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { loginSchema, signupSchema } from "../validators/auth.validator";

export const authRouter = Router();

authRouter.post("/signup", validate(signupSchema), signup);
authRouter.post("/login", validate(loginSchema), login);
authRouter.get("/me", requireAuth, me);