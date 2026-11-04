import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createSchema } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { CampusService } from "@/lib/service";
import { consumeRateLimit } from "@/lib/rate-limit";
import { authenticateCredentials } from "@/lib/credentials";
import { assertSameOrigin, readJsonBody } from "@/lib/security";
import { renderDocument } from "@/lib/document";
import { mondayInMoscow, addDays } from "@/lib/time";

const now = new Date("2026-11-04T12:00:00.000Z");
let db: Client;
let service: CampusService;
let dir: string;
let dbUrl: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "orbita-test-"));
  dbUrl = pathToFileURL(join(dir, "test.db")).href;
  db = createClient({ url: "file::memory:" });
  await createSchema(db);
  await seedDatabase(db, now, 4);
  service = new CampusService(db, () => now);
});

afterEach(async () => {
  db.close();
  // The native libSQL Windows binding releases prepared-statement file handles during GC.
  global.gc?.();
  await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
});

describe("student data and seed", () => {
  it("gives each student their own profile, timetable and grades without password hashes", async () => {
    const first = await service.getWorkspace("student-1");
    const second = await service.getWorkspace("student-2");
    expect(first.user.login).toBe("student1");
    expect(second.user.login).toBe("student2");
    expect(first.user.name).not.toBe(second.user.name);
    expect(first.classes.length).toBeGreaterThan(5);
    expect(first.classes.some((item) => item.date === "2026-11-04")).toBe(false);
    expect(
      first.classes.every(
        (item) => item.date >= first.weekStart && item.date < addDays(first.weekStart, 7),
      ),
    ).toBe(true);
    expect(
      first.classes.filter(
        (item) => item.date >= first.weekStart && item.date < addDays(first.weekStart, 7),
      ),
    ).toHaveLength(9);
    expect(first.grades[0].score).not.toBe(second.grades[0].score);
    expect(JSON.stringify(first)).not.toMatch(/password|hash|OrbitDemo/);
    await expect(service.getWorkspace("unknown")).rejects.toMatchObject({ status: 401 });
  });

  it("seeding again preserves student submissions, staff decisions and read state", async () => {
    const request = await service.createRequest("student-1", {
      type: "study",
      purpose: "Для стажировки",
    });
    await service.updateRequest("staff-1", request.id, {
      status: "processing",
      comment: "Проверяем данные",
    });
    await service.markNotificationsRead("student-1", {});
    await seedDatabase(db, now, 4);
    const workspace = await service.getWorkspace("student-1");
    expect(workspace.requests.find((item) => item.id === request.id)?.status).toBe("processing");
    expect(workspace.notifications.every((item) => item.read)).toBe(true);
    expect(workspace.classes).toHaveLength(9);
  });
});

describe("request permissions and atomic workflow", () => {
  it("binds ownership on server and hides guessed request IDs", async () => {
    const request = await service.createRequest("student-1", {
      type: "transcript",
      purpose: "Для участия в обмене",
      comment: "На русском языке",
    });
    expect(request.status).toBe("submitted");
    expect(request.events).toHaveLength(1);
    await expect(service.getRequest("student-2", request.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.getDocument("student-2", request.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.getRequest("student-1", "missing")).rejects.toMatchObject({ status: 404 });
    await expect(
      service.createRequest("student-1", {
        type: "study",
        purpose: "Для работы",
        userId: "student-2",
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.createRequest("staff-1", { type: "study", purpose: "Для работы" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(service.getQueue("student-1")).rejects.toMatchObject({ status: 403 });
    await expect(
      service.updateRequest("student-1", request.id, { status: "processing" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      (await service.getQueue("staff-1")).find((item) => item.id === request.id)?.student.id,
    ).toBe("student-1");
  });

  it("moves through the staff workflow, records events and notifies only the owner", async () => {
    const request = await service.createRequest("student-1", {
      type: "study",
      purpose: "В учебный отдел",
    });
    await expect(service.getDocument("student-1", request.id)).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      service.updateRequest("staff-1", request.id, { status: "ready" }),
    ).rejects.toMatchObject({ status: 409 });
    const processing = await service.updateRequest("staff-1", request.id, { status: "processing" });
    expect(processing.events).toHaveLength(2);
    const retry = await service.updateRequest("staff-1", request.id, { status: "processing" });
    expect(retry.events).toHaveLength(2);
    const ready = await service.updateRequest("staff-1", request.id, {
      status: "ready",
      comment: "Готово, можно скачать",
    });
    expect(ready.events).toHaveLength(3);
    expect(ready.staffComment).toBe("Готово, можно скачать");
    const doc = await service.getDocument("student-1", request.id);
    expect(doc.request.id).toBe(request.id);
    expect((await service.getDocument("staff-1", request.id)).student.id).toBe("student-1");
    await expect(
      service.updateRequest("staff-1", request.id, { status: "processing" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await service.getWorkspace("student-1")).notifications.some((n) =>
        n.body.includes(request.number),
      ),
    ).toBe(true);
    expect(
      (await service.getWorkspace("student-2")).notifications.some((n) =>
        n.body.includes(request.number),
      ),
    ).toBe(false);
  });

  it("allows rejection but requires an explanation", async () => {
    const request = await service.createRequest("student-1", {
      type: "application",
      purpose: "Изменение учебного плана",
    });
    await expect(
      service.updateRequest("staff-1", request.id, { status: "rejected" }),
    ).rejects.toMatchObject({ status: 400 });
    const rejected = await service.updateRequest("staff-1", request.id, {
      status: "rejected",
      comment: "Уточните выбранные дисциплины",
    });
    expect(rejected.status).toBe("rejected");
  });

  it("reloads role and disabled state from the database for every operation", async () => {
    const request = await service.createRequest("student-1", {
      type: "study",
      purpose: "По месту требования",
    });
    await db.execute("UPDATE users SET role = 'student' WHERE id = 'staff-1'");
    await expect(
      service.updateRequest("staff-1", request.id, { status: "processing" }),
    ).rejects.toMatchObject({ status: 403 });
    await db.execute("UPDATE users SET disabled = 1 WHERE id = 'student-1'");
    await expect(service.getWorkspace("student-1")).rejects.toMatchObject({ status: 401 });
    await expect(
      service.createRequest("student-1", { type: "study", purpose: "По месту требования" }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rolls back status and event if the notification insert fails", async () => {
    const request = await service.createRequest("student-1", {
      type: "study",
      purpose: "По месту требования",
    });
    await db.execute(
      "CREATE TRIGGER reject_notification BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT, 'test failure'); END",
    );
    await expect(
      service.updateRequest("staff-1", request.id, { status: "processing" }),
    ).rejects.toThrow();
    const unchanged = await service.getRequest("student-1", request.id);
    expect(unchanged.status).toBe("submitted");
    expect(unchanged.events).toHaveLength(1);
    await db.execute("DROP TRIGGER reject_notification");
    expect(
      (await service.updateRequest("staff-1", request.id, { status: "processing" })).status,
    ).toBe("processing");
  });

  it("serializes concurrent local writes without duplicate events or lost rate-limit increments", async () => {
    const request = await service.createRequest("student-1", {
      type: "study",
      purpose: "По месту требования",
    });
    const results = await Promise.all([
      service.updateRequest("staff-1", request.id, { status: "processing" }),
      service.updateRequest("staff-1", request.id, { status: "processing" }),
      consumeRateLimit(db, "concurrent-write", 1, 1000, now.getTime()),
    ]);
    expect(results[2]).toBe(true);
    expect((await service.getRequest("student-1", request.id)).events).toHaveLength(2);
    expect(await consumeRateLimit(db, "concurrent-write", 1, 1000, now.getTime())).toBe(false);
  });

  it("validates input limits and rejects arbitrary status updates", async () => {
    await expect(
      service.createRequest("student-1", { type: "admin", purpose: "x" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.createRequest("student-1", {
        type: "study",
        purpose: " ",
        comment: "x".repeat(2001),
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.updateRequest("staff-1", "missing", { status: "processing" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.updateRequest("staff-1", "missing", { status: "forged" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("notification isolation", () => {
  it("supports one or all of the current student's notifications and hides foreign IDs", async () => {
    const mine = (await service.getWorkspace("student-1")).notifications;
    const other = (await service.getWorkspace("student-2")).notifications;
    await expect(
      service.markNotificationsRead("student-1", { id: other[0].id }),
    ).rejects.toMatchObject({ status: 404 });
    expect(await service.markNotificationsRead("student-1", { id: mine[0].id })).toEqual({
      updated: 1,
    });
    expect(await service.markNotificationsRead("student-1", { id: mine[0].id })).toEqual({
      updated: 0,
    });
    await service.markNotificationsRead("student-1", {});
    expect((await service.getWorkspace("student-1")).notifications.every((n) => n.read)).toBe(true);
    expect((await service.getWorkspace("student-2")).notifications.some((n) => !n.read)).toBe(true);
    await expect(
      service.markNotificationsRead("student-1", { userId: "student-2" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("authentication and durable abuse controls", () => {
  it("authenticates seeded bcrypt credentials without returning a hash", async () => {
    const user = await authenticateCredentials(
      db,
      { login: " Student1 ", password: "OrbitDemo2026!" },
      "test",
      now,
    );
    expect(user?.id).toBe("student-1");
    expect(JSON.stringify(user)).not.toMatch(/password|hash|OrbitDemo/);
    expect(
      await authenticateCredentials(db, { login: "student1", password: "incorrect" }, "test", now),
    ).toBeNull();
    expect(
      await authenticateCredentials(db, { login: "unknown", password: "incorrect" }, "test", now),
    ).toBeNull();
    expect(
      await authenticateCredentials(
        db,
        { login: "student1", password: "x".repeat(1000) },
        "test",
        now,
      ),
    ).toBeNull();
    await db.execute("UPDATE users SET disabled = 1 WHERE id = 'student-1'");
    expect(
      await authenticateCredentials(
        db,
        { login: "student1", password: "OrbitDemo2026!" },
        "test",
        now,
      ),
    ).toBeNull();
  });

  it("keeps limits across database clients and resets only after the window", async () => {
    const persistent = createClient({ url: dbUrl });
    await createSchema(persistent);
    expect(await consumeRateLimit(persistent, "test", 2, 1000, now.getTime())).toBe(true);
    const second = createClient({ url: dbUrl });
    expect(await consumeRateLimit(second, "test", 2, 1000, now.getTime())).toBe(true);
    expect(await consumeRateLimit(second, "test", 2, 1000, now.getTime())).toBe(false);
    second.close();
    expect(await consumeRateLimit(persistent, "test", 2, 1000, now.getTime() + 1001)).toBe(true);
    persistent.close();
  });

  it("limits even correct passwords after repeated account attempts", async () => {
    for (let i = 0; i < 10; i += 1) {
      await authenticateCredentials(db, { login: "student1", password: "incorrect" }, "test", now);
    }
    expect(
      await authenticateCredentials(
        db,
        { login: "student1", password: "OrbitDemo2026!" },
        "new-network",
        now,
      ),
    ).toBeNull();
  });
});

describe("HTTP and document boundaries", () => {
  it("rejects missing, cross-site and lookalike origins", () => {
    const make = (origin?: string) =>
      new Request("https://orbita.example/api/requests", {
        method: "POST",
        headers: origin ? { origin } : {},
      });
    expect(() =>
      assertSameOrigin(make("https://orbita.example"), "https://orbita.example"),
    ).not.toThrow();
    for (const origin of [
      undefined,
      "null",
      "https://evil.example",
      "https://orbita.example.evil.example",
    ]) {
      expect(() => assertSameOrigin(make(origin), "https://orbita.example")).toThrow();
    }
  });

  it("bounds bodies by actual bytes and rejects malformed JSON or non-JSON content", async () => {
    const make = (body: string, contentType = "application/json") =>
      new Request("http://localhost/api", {
        method: "POST",
        body,
        headers: { "content-type": contentType },
      });
    expect(await readJsonBody(make('{"type":"study"}'))).toEqual({ type: "study" });
    await expect(readJsonBody(make("{bad"))).rejects.toMatchObject({ status: 400 });
    await expect(readJsonBody(make("{}", "text/plain"))).rejects.toMatchObject({ status: 415 });
    await expect(readJsonBody(make('"' + "я".repeat(9000) + '"'))).rejects.toMatchObject({
      status: 413,
    });
  });

  it("escapes user text and visibly marks downloaded documents as fictional", async () => {
    const request = await service.createRequest("student-1", {
      type: "study",
      purpose: '<script>alert("x")</script>',
    });
    await service.updateRequest("staff-1", request.id, { status: "processing" });
    await service.updateRequest("staff-1", request.id, { status: "ready" });
    const document = await service.getDocument("student-1", request.id);
    const html = renderDocument(document);
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("НЕ ЯВЛЯЕТСЯ ОФИЦИАЛЬНЫМ ДОКУМЕНТОМ");
    expect(html).toContain(request.number);
  });

  it("uses Moscow calendar week at the Sunday/Monday UTC boundary", () => {
    expect(mondayInMoscow(new Date("2026-11-01T21:30:00Z"))).toBe("2026-11-02");
    expect(mondayInMoscow(new Date("2026-11-01T20:30:00Z"))).toBe("2026-10-26");
  });
});
