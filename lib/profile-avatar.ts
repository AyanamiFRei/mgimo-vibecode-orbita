import type { Client } from "@libsql/client";
import sharp from "sharp";
import { withDatabaseWrite } from "@/lib/database-write";
import { AppError, notFound } from "@/lib/errors";
import { profileAvatarUrl } from "@/lib/users";

const maxFileBytes = 3 * 1024 * 1024;
const maxRequestBytes = maxFileBytes + 4096; // Allow the multipart headers and boundary.
const maxPixels = 16_000_000;
const maxStoredBytes = 100 * 1024;
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function tooLarge() {
  return new AppError(413, "PHOTO_TOO_LARGE", "Размер файла должен быть не больше 3 МБ.");
}

function invalidForm() {
  return new AppError(400, "INVALID_PHOTO_FORM", "Выберите один файл с фотографией.");
}

async function readPhoto(request: Request): Promise<File> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.split(";")[0].trim().toLowerCase() !== "multipart/form-data") {
    throw new AppError(415, "INVALID_PHOTO_FORM", "Отправьте фотографию через форму загрузки.");
  }
  if (Number(request.headers.get("content-length")) > maxRequestBytes) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw invalidForm();
  // A single bounded buffer also bounds overhead when a client sends many tiny chunks.
  const bytes = new Uint8Array(maxRequestBytes);
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.length > bytes.length - length) {
        await reader.cancel();
        throw tooLarge();
      }
      bytes.set(value, length);
      length += value.length;
    }
  } finally {
    reader.releaseLock();
  }
  let form: FormData;
  try {
    form = await new Response(bytes.subarray(0, length), {
      headers: { "Content-Type": contentType },
    }).formData();
  } catch {
    throw invalidForm();
  }
  const photo = form.get("photo");
  if (!photo || typeof photo === "string" || !photo.size || [...form.keys()].length !== 1) {
    throw invalidForm();
  }
  if (photo.size > maxFileBytes) throw tooLarge();
  return photo;
}

function rasterMime(bytes: Buffer): string | null {
  if (bytes.subarray(0, pngSignature.length).equals(pngSignature)) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function normalizePhoto(request: Request): Promise<Buffer> {
  const file = await readPhoto(request);
  const input = Buffer.from(await file.arrayBuffer());
  if (rasterMime(input) !== file.type) {
    throw new AppError(415, "UNSUPPORTED_PHOTO", "Выберите изображение JPEG, PNG или WebP.");
  }
  try {
    const image = await sharp(input, { limitInputPixels: maxPixels, failOn: "warning" })
      .autoOrient()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 80 })
      .timeout({ seconds: 5 })
      .toBuffer();
    if (image.length <= maxStoredBytes) return image;
  } catch {
    // Decoder errors can contain details of the file. Return the same public validation error.
  }
  throw new AppError(
    400,
    "INVALID_PHOTO",
    "Не удалось обработать фото. Проверьте файл и выберите изображение до 16 мегапикселей.",
  );
}

export async function saveAvatar(db: Client, userId: string, image: Buffer) {
  const result = await withDatabaseWrite(db, () =>
    db.execute({
      sql: `INSERT INTO user_avatars (user_id, image, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET image = excluded.image,
          updated_at = MAX(user_avatars.updated_at + 1, excluded.updated_at)
          RETURNING updated_at`,
      args: [userId, image, Date.now()],
    }),
  );
  return { avatarUrl: profileAvatarUrl(Number(result.rows[0].updated_at)) };
}

export async function getAvatar(db: Client, userId: string): Promise<ArrayBuffer> {
  const result = await db.execute({
    sql: "SELECT image FROM user_avatars WHERE user_id = ?",
    args: [userId],
  });
  const image = result.rows[0]?.image;
  if (!(image instanceof ArrayBuffer)) notFound();
  return image;
}

export async function deleteAvatar(db: Client, userId: string) {
  await withDatabaseWrite(db, () =>
    db.execute({
      sql: "DELETE FROM user_avatars WHERE user_id = ?",
      args: [userId],
    }),
  );
  return { avatarUrl: null };
}
