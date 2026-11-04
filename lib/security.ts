import { AppError } from "@/lib/errors";

export function assertSameOrigin(request: Request, canonicalUrl = process.env.NEXTAUTH_URL): void {
  const origin = request.headers.get("origin");
  if (!canonicalUrl || !origin || origin === "null") {
    throw new AppError(
      403,
      "INVALID_ORIGIN",
      "Не удалось проверить источник запроса. Обновите страницу.",
    );
  }
  try {
    if (
      new URL(origin).origin !== new URL(canonicalUrl).origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      throw new Error("Origin mismatch");
    }
  } catch {
    throw new AppError(403, "INVALID_ORIGIN", "Запрос с другого сайта отклонён.");
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
  ) {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Ожидается запрос в формате JSON.");
  }
  const maxBytes = 16 * 1024;
  const tooLarge = () => new AppError(413, "BODY_TOO_LARGE", "Текст запроса слишком большой.");
  if (Number(request.headers.get("content-length")) > maxBytes) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "INVALID_JSON", "Не удалось прочитать запрос.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw tooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError(400, "INVALID_JSON", "Не удалось прочитать запрос.");
  }
}
