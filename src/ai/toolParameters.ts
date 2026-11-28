import { z } from "zod";

export function toToolParameters(schema: z.ZodType): Record<string, unknown> {
  const { $schema, ...parameters } = z.toJSONSchema(schema);
  return parameters;
}