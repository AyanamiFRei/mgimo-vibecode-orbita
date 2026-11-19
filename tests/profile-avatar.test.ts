import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import sharp from "sharp";
import { createSchema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";
import { findUser, requireActor } from "@/lib/users";
import { consumeRateLimit } from "@/lib/rate-limit";
import { DELETE, GET, PUT } from "@/app/api/profile/avatar/route";

let db: Client;
vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/db", async (original) => ({
  ...(await original<typeof import("@/lib/db")>()),
  getDb: () => db,
}));

const origin = "http://localhost:3000";
const endpoint = origin + "/api/profile/avatar";
const read = () => new Request(endpoint);
const remove = (source = origin) =>
  new Request(endpoint, { method: "DELETE", headers: { origin: source } });

function upload(bytes: Uint8Array, type = "image/png", source = origin) {
  const form = new FormData();
  form.set("photo", new Blob([Uint8Array.from(bytes)], { type }), "profile-photo");
  return new Request(endpoint, { method: "PUT", headers: { origin: source }, body: form });
}

function fixture(format: "png" | "jpeg" | "webp" = "png") {
  return sharp({ create: { width: 300, height: 180, channels: 3, background: "teal" } })
    .withMetadata({ orientation: 6 })
    .toFormat(format)
    .toBuffer();
}

async function login(id: string) {
  vi.mocked(getSessionUser).mockResolvedValue(await requireActor(db, id));
}

beforeEach(async () => {
  vi.stubEnv("NEXTAUTH_URL", origin);
  db = createClient({ url: "file::memory:" });
  await createSchema(db);
  await seedDatabase(db, new Date(), 4);
  vi.mocked(getSessionUser).mockResolvedValue(null);
});

afterEach(() => {
  db.close();
  vi.unstubAllEnvs();
});

describe("private profile photo", () => {
  it("requires a session for each operation and rejects foreign-origin changes", async () => {
    const input = await fixture();
    for (const response of [await GET(read()), await PUT(upload(input)), await DELETE(remove())]) {
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
    await login("student-1");
    expect((await PUT(upload(input, "image/png", "https://other.example"))).status).toBe(403);
    expect((await DELETE(remove("https://other.example"))).status).toBe(403);
    expect((await GET(read())).status).toBe(404);
  });

  it.each(["jpeg", "png", "webp"] as const)(
    "re-encodes %s to a small metadata-free WebP",
    async (format) => {
      await login("student-1");
      const input = await fixture(format);
      const saved = await PUT(upload(input, "image/" + format));
      expect(saved.status).toBe(200);
      const { data } = await saved.json();
      expect(data.avatarUrl).toMatch(/^\/api\/profile\/avatar\?v=.+/);
      expect((await findUser(db, "student-1"))?.avatarUrl).toBe(data.avatarUrl);
      const photo = await GET(new Request(origin + data.avatarUrl));
      expect(photo.status).toBe(200);
      expect(photo.headers.get("content-type")).toBe("image/webp");
      expect(photo.headers.get("x-content-type-options")).toBe("nosniff");
      expect(photo.headers.get("cache-control")).toContain("private, no-store");
      const bytes = Buffer.from(await photo.arrayBuffer());
      const metadata = await sharp(bytes).metadata();
      expect(metadata).toMatchObject({ format: "webp", width: 256, height: 256 });
      expect(metadata.exif).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
      expect(bytes.byteLength).toBeLessThanOrEqual(100 * 1024);
      expect(bytes.equals(input)).toBe(false);
    },
  );

  it("isolates photos by session, preserves them across migrations and supports replacement and deletion", async () => {
    await login("student-1");
    const first = (await (await PUT(upload(await fixture()))).json()).data.avatarUrl;
    await createSchema(db);
    expect((await findUser(db, "student-1"))?.avatarUrl).toBe(first);
    await login("student-2");
    expect((await findUser(db, "student-2"))?.avatarUrl).toBeNull();
    expect((await GET(new Request(origin + first))).status).toBe(404);
    await DELETE(remove());
    await login("student-1");
    expect((await GET(read())).status).toBe(200);
    const replacement = await PUT(upload(await fixture("jpeg"), "image/jpeg"));
    expect((await replacement.json()).data.avatarUrl).not.toBe(first);
    expect((await DELETE(remove())).status).toBe(200);
    expect((await DELETE(remove())).status).toBe(200);
    expect((await findUser(db, "student-1"))?.avatarUrl).toBeNull();
    expect((await GET(read())).status).toBe(404);
  });

  it("rejects unknown formats, false MIME, truncated pixels and unexpected form fields", async () => {
    await login("student-1");
    const input = await fixture();
    expect((await PUT(upload(input, "image/svg+xml"))).status).toBe(415);
    expect((await PUT(upload(input, "image/jpeg"))).status).toBe(415);
    expect((await PUT(upload(Buffer.from("<svg/>")))).status).toBe(415);
    expect((await PUT(upload(input.subarray(0, 32)))).status).toBe(400);
    const form = new FormData();
    form.append("photo", new Blob([Uint8Array.from(input)], { type: "image/png" }), "x.png");
    form.append("userId", "student-2");
    expect(
      (await PUT(new Request(endpoint, { method: "PUT", headers: { origin }, body: form }))).status,
    ).toBe(400);
    const invalid = (type: string) =>
      new Request(endpoint, {
        method: "PUT",
        headers: { origin, "content-type": type },
        body: "invalid",
      });
    expect((await PUT(invalid("multipart/form-data; boundary=missing"))).status).toBe(400);
    expect((await PUT(invalid("application/json"))).status).toBe(415);
    expect((await GET(read())).status).toBe(404);
  });

  it("bounds compressed file size, actual stream size and decoded pixel count", async () => {
    await login("student-1");
    expect((await PUT(upload(new Uint8Array(3 * 1024 * 1024 + 1)))).status).toBe(413);
    const declared = upload(new Uint8Array());
    declared.headers.set("content-length", String(4 * 1024 * 1024));
    expect((await PUT(declared)).status).toBe(413);
    expect(declared.bodyUsed).toBe(false);
    const cancel = vi.fn();
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(256 * 1024));
      },
      cancel,
    });
    const options = {
      method: "PUT",
      headers: { origin, "content-type": "multipart/form-data; boundary=x" },
      body: stream,
      duplex: "half",
    };
    expect((await PUT(new Request(endpoint, options))).status).toBe(413);
    expect(cancel).toHaveBeenCalledOnce();
    const oversized = await sharp({
      create: { width: 4001, height: 4000, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    expect((await PUT(upload(oversized))).status).toBe(400);
    expect((await GET(read())).status).toBe(404);
  });

  it("rate limits expensive writes per account before reading an upload", async () => {
    await login("student-1");
    for (let i = 0; i < 10; i += 1) {
      await consumeRateLimit(db, "api:profile-avatar-write:student-1", 10, 60_000);
    }
    const request = upload(await fixture());
    const response = await PUT(request);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(request.bodyUsed).toBe(false);
    await login("student-2");
    expect((await PUT(request)).status).toBe(200);
  });
});
