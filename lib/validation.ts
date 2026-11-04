import { z } from "zod";
import { AppError } from "@/lib/errors";

export const createRequestSchema = z
  .object({
    type: z.enum(["study", "scholarship", "transcript", "application"]),
    purpose: z.string().trim().min(3).max(240),
    comment: z.string().trim().max(2000).optional().default(""),
  })
  .strict();

export const updateRequestSchema = z
  .object({
    status: z.enum(["submitted", "processing", "ready", "rejected"]),
    comment: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine((value) => value.status !== "rejected" || (value.comment?.length ?? 0) >= 3, {
    message: "Для отказа укажите причину.",
  });

export const readNotificationsSchema = z
  .object({ id: z.string().min(1).max(128).optional() })
  .strict();

export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      400,
      "INVALID_INPUT",
      "Проверьте поля формы и длину текста. При отказе нужна причина.",
    );
  }
  return parsed.data;
}
