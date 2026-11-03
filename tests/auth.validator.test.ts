import { describe, expect, it } from "vitest";
import { signupSchema } from "../src/validators/auth.validator";

describe("signupSchema", () => {
  it("cleans the email", () => {
    const input = {
      businessName: "Mama Tunde Foods",
      waPhoneNumberId: "test-123",
      email: "  Owner@Example.COM ",
      password: "secret123",
    };

    const result = signupSchema.parse(input);

    expect(result.email).toBe("owner@example.com");
  });

  it("rejects a short password", () => {
    const input = {
      businessName: "Mama Tunde Foods",
      waPhoneNumberId: "test-123",
      email: "owner@example.com",
      password: "short",
    };

    const result = signupSchema.safeParse(input);

    expect(result.success).toBe(false);
  });
});