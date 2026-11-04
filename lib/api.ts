import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/security";
import type { User } from "@/lib/types";

export const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };

export async function requireApiUser(
  request: Request,
  mutation = false,
  bucket = "read",
): Promise<User> {
  if (mutation) assertSameOrigin(request);
  const user = await getSessionUser();
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Войдите в кабинет, чтобы продолжить.");
  const creation = bucket === "create-request" || bucket === "teacher-thread";
  const limit = creation ? 20 : bucket === "teacher-message" ? 30 : mutation ? 90 : 240;
  const window = creation ? 60 * 60_000 : 60_000;
  if (!(await consumeRateLimit(getDb(), `api:${bucket}:${user.id}`, limit, window))) {
    throw new AppError(
      429,
      "RATE_LIMITED",
      "Слишком много запросов. Подождите немного и попробуйте снова.",
    );
  }
  return user;
}

export function apiError(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      {
        status: error.status,
        headers: { ...privateHeaders, ...(error.status === 429 ? { "Retry-After": "60" } : {}) },
      },
    );
  }
  // Log a category only: database errors can contain query arguments or credentials.
  console.error("orbita.api.unexpected", error instanceof Error ? error.name : "unknown");
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Не удалось выполнить действие. Попробуйте ещё раз чуть позже.",
      },
    },
    { status: 500, headers: privateHeaders },
  );
}

export async function api<T>(action: () => Promise<T>, status = 200): Promise<Response> {
  try {
    return Response.json({ data: await action() }, { status, headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
