import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import type { LoginInput, SignupInput } from "../validators/auth.validator";


export async function signup(input: SignupInput) {
  const emailTaken = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (emailTaken) {
    throw new AppError(409, "This email is already registered");
  }

  const numberTaken = await prisma.vendor.findUnique({
    where: { waPhoneNumberId: input.waPhoneNumberId },
  });
  if (numberTaken) {
    throw new AppError(409, "This WhatsApp number is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const vendor = await prisma.vendor.create({
    data: {
      name: input.businessName,
      waPhoneNumberId: input.waPhoneNumberId,
      users: {
        create: {
          email: input.email,
          passwordHash: passwordHash,
          role: "owner",
        },
      },
    },
    include: { users: true },
  });

  const owner = vendor.users[0]!;

  return {
    vendor: { id: vendor.id, name: vendor.name },
    user: { id: owner.id, email: owner.email, role: owner.role },
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordOk) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = jwt.sign(
    { sub: user.id, vendorId: user.vendorId, role: user.role },
    env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  return { token };
}