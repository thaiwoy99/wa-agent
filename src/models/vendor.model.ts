import { prisma } from "../config/db";

export function findVendorByPhoneNumberId(phoneNumberId: string) {
  return prisma.vendor.findUnique({
    where: { waPhoneNumberId: phoneNumberId },
  });
}