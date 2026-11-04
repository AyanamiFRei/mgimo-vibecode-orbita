import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { createSchema } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { getSessionUser } from "@/lib/auth";
import { requireActor } from "@/lib/users";
import { CampusService } from "@/lib/service";
import { consumeRateLimit } from "@/lib/rate-limit";
import { api, apiError } from "@/lib/api";
import { GET as getWorkspace } from "@/app/api/workspace/route";
import { POST as createRequest } from "@/app/api/requests/route";
import { GET as getRequest, PATCH as updateRequest } from "@/app/api/requests/[id]/route";
import { GET as getDocument } from "@/app/api/requests/[id]/document/route";
import { GET as getQueue } from "@/app/api/staff/requests/route";
import { POST as readNotifications } from "@/app/api/notifications/read/route";
import { POST as register } from "@/app/api/auth/register/route";
import { GET as schedule } from "@/app/api/schedule/route";
import { GET as teachers } from "@/app/api/teachers/route";
import { GET as threads, POST as startThread } from "@/app/api/teacher-threads/route";
import {
  GET as conversation,
  POST as sendMessage,
} from "@/app/api/teacher-threads/[id]/messages/route";
import { POST as readThread } from "@/app/api/teacher-threads/[id]/read/route";
import { GET as teacherInbox } from "@/app/api/staff/teacher-threads/route";

let db: Client;
vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getDb: () => db,
}));

const origin = "http://localhost:3000";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const read = (path = "/api/workspace") => new Request(origin + path);
const write = (path: string, body: unknown, method = "POST", source = origin) =>
  new Request(origin + path, {
    method,
    headers: { origin: source, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

async function login(id: string | null) {
  vi.mocked(getSessionUser).mockResolvedValue(id ? await requireActor(db, id) : null);
}

beforeEach(async () => {
  vi.stubEnv("NEXTAUTH_URL", origin);
  db = createClient({ url: "file::memory:" });
  await createSchema(db);
  await seedDatabase(db, new Date(), 4);
  await login(null);
});

afterEach(() => {
  db.close();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("HTTP routes backed by the real service and SQLite", () => {
  it("registers fictional accounts without email, rejects foreign origins and never returns a password", async () => {
    const body = {
      login: "http_student",
      password: "HttpStudent2026!",
      program: "international-relations",
      persona: "lev",
    };
    expect(
      (await register(write("/api/auth/register", body, "POST", "https://evil.example"))).status,
    ).toBe(403);
    expect(
      (await register(write("/api/auth/register", { ...body, email: "real@example.com" }))).status,
    ).toBe(400);
    const created = await register(write("/api/auth/register", body));
    expect(created.status).toBe(201);
    expect(created.headers.get("cache-control")).toContain("no-store");
    expect(await created.json()).toEqual({ data: { login: "http_student" } });
    expect((await register(write("/api/auth/register", body))).status).toBe(409);
  });

  it("protects schedule, teacher directory and every contact route without a session", async () => {
    const responses = await Promise.all([
      schedule(read("/api/schedule?semester=spring-2027")),
      teachers(read("/api/teachers")),
      threads(read("/api/teacher-threads")),
      teacherInbox(read()),
      startThread(write("/api/teacher-threads", {})),
      conversation(read(), ctx("guessed")),
      sendMessage(write("/api/teacher-threads/guessed/messages", {}), ctx("guessed")),
      readThread(write("/api/teacher-threads/guessed/read", {}), ctx("guessed")),
    ]);
    expect(responses.every((response) => response.status === 401)).toBe(true);
  });

  it("serves the full semester through bounded weeks with holiday explanations", async () => {
    await login("student-1");
    const response = await schedule(read("/api/schedule?semester=spring-2027&week=2027-02-15"));
    expect(response.status).toBe(200);
    const data = (await response.json()).data;
    expect(data.days).toHaveLength(7);
    expect(data.classes.some((item: { date: string }) => item.date === "2027-02-20")).toBe(true);
    expect(
      (await schedule(read("/api/schedule?semester=spring-2027&week=2027-02-30"))).status,
    ).toBe(400);
    expect((await schedule(read("/api/schedule?userId=student-2"))).status).toBe(400);
  });

  it("persists a private student/staff conversation, explicit read marker and safe sender identity", async () => {
    await login("student-1");
    const directory = await teachers(read("/api/teachers"));
    expect((await directory.json()).data).toHaveLength(6);
    const started = await startThread(
      write("/api/teacher-threads", {
        teacherId: "teacher-1",
        subject: "Вопрос о зачёте",
        body: "Как подготовиться?",
      }),
    );
    expect(started.status).toBe(201);
    const initial = (await started.json()).data;
    expect((await threads(read())).status).toBe(200);
    expect((await teacherInbox(read())).status).toBe(403);
    await login("student-2");
    expect((await conversation(read(), ctx(initial.thread.id))).status).toBe(404);
    expect(
      (
        await sendMessage(
          write("/api/teacher-threads/id/messages", { body: "Чужой текст" }),
          ctx(initial.thread.id),
        )
      ).status,
    ).toBe(404);
    expect(
      (await readThread(write("/api/teacher-threads/id/read", {}), ctx(initial.thread.id))).status,
    ).toBe(404);
    await login("staff-1");
    expect((await teacherInbox(read())).status).toBe(200);
    const reply = await sendMessage(
      write("/api/teacher-threads/id/messages", { body: "Посмотрите материалы курса." }),
      ctx(initial.thread.id),
    );
    expect(reply.status).toBe(201);
    expect((await reply.json()).data).toMatchObject({
      senderRole: "staff",
      senderName: "София Берегова",
      isSimulation: false,
    });
    await login("student-1");
    expect((await conversation(read(), ctx(initial.thread.id))).status).toBe(200);
    expect(
      (await readThread(write("/api/teacher-threads/id/read", {}), ctx(initial.thread.id))).status,
    ).toBe(200);
    expect(
      (
        await readThread(
          write("/api/teacher-threads/id/read", { userId: "student-2" }),
          ctx(initial.thread.id),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await sendMessage(
          write("/api/teacher-threads/id/messages", { body: "Спасибо", senderName: "Декан" }),
          ctx(initial.thread.id),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await sendMessage(
          write(
            "/api/teacher-threads/id/messages",
            { body: "Спасибо" },
            "POST",
            "https://evil.example",
          ),
          ctx(initial.thread.id),
        )
      ).status,
    ).toBe(403);
  });

  it("rate limits thread creation and replies using persistent per-user quotas", async () => {
    await login("student-1");
    for (let index = 0; index < 20; index += 1)
      await consumeRateLimit(db, "api:teacher-thread:student-1", 20, 3_600_000);
    expect(
      (
        await startThread(
          write("/api/teacher-threads", {
            teacherId: "teacher-1",
            subject: "Вопрос",
            body: "Текст",
          }),
        )
      ).status,
    ).toBe(429);
    for (let index = 0; index < 30; index += 1)
      await consumeRateLimit(db, "api:teacher-message:student-1", 30, 60_000);
    expect(
      (
        await sendMessage(
          write("/api/teacher-threads/id/messages", { body: "Текст" }),
          ctx("guessed"),
        )
      ).status,
    ).toBe(429);
  });

  it("returns 401 from every data route without a session and never caches private responses", async () => {
    const responses = await Promise.all([
      getWorkspace(read()),
      getRequest(read(), ctx("guessed")),
      getQueue(read()),
      getDocument(read(), ctx("guessed")),
      createRequest(write("/api/requests", {})),
      updateRequest(write("/api/requests/guessed", {}, "PATCH"), ctx("guessed")),
      readNotifications(write("/api/notifications/read", {})),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("returns only the authenticated user's workspace and request and denies staff routes", async () => {
    await login("student-1");
    const response = await getWorkspace(read());
    expect(response.status).toBe(200);
    const workspace = (await response.json()).data;
    expect(workspace.user.id).toBe("student-1");
    expect(JSON.stringify(workspace)).not.toMatch(/password_hash|student-2|OrbitDemo/);
    expect((await getRequest(read(), ctx("student-1-request-study"))).status).toBe(200);
    expect((await getRequest(read(), ctx("student-2-request-study"))).status).toBe(404);
    expect((await getDocument(read(), ctx("student-2-request-study"))).status).toBe(404);
    expect((await getQueue(read())).status).toBe(403);
    expect(
      (
        await updateRequest(
          write("/api/requests/a", { status: "ready" }, "PATCH"),
          ctx("student-1-request-study"),
        )
      ).status,
    ).toBe(403);
  });

  it("executes submit → staff processing → ready → owner download and notification read", async () => {
    await login("student-1");
    const created = await createRequest(
      write("/api/requests", { type: "study", purpose: "Для участия в стажировке" }),
    );
    expect(created.status).toBe(201);
    const request = (await created.json()).data;
    expect(request.status).toBe("submitted");
    expect((await getDocument(read(), ctx(request.id))).status).toBe(409);
    await login("staff-1");
    const queue = await getQueue(read());
    expect(queue.status).toBe(200);
    expect((await queue.json()).data.some((item: { id: string }) => item.id === request.id)).toBe(
      true,
    );
    const processing = await updateRequest(
      write("/api/requests/" + request.id, { status: "processing" }, "PATCH"),
      ctx(request.id),
    );
    expect(processing.status).toBe(200);
    const ready = await updateRequest(
      write("/api/requests/" + request.id, { status: "ready", comment: "Проверено" }, "PATCH"),
      ctx(request.id),
    );
    expect((await ready.json()).data.events).toHaveLength(3);
    await login("student-1");
    const document = await getDocument(read(), ctx(request.id));
    expect(document.status).toBe(200);
    expect(document.headers.get("content-type")).toContain("text/html");
    expect(document.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(document.headers.get("cache-control")).toContain("no-store");
    expect(await document.text()).toContain("НЕ ЯВЛЯЕТСЯ ОФИЦИАЛЬНЫМ ДОКУМЕНТОМ");
    const notification = await readNotifications(write("/api/notifications/read", {}));
    expect(notification.status).toBe(200);
    expect((await notification.json()).data.updated).toBeGreaterThan(0);
    expect(
      (await new CampusService(db).getWorkspace("student-1")).notifications.every(
        (item) => item.read,
      ),
    ).toBe(true);
  });

  it("rejects cross-origin requests, forged ownership, malformed JSON and oversized bodies", async () => {
    await login("student-1");
    expect(
      (
        await createRequest(
          write(
            "/api/requests",
            { type: "study", purpose: "Для работы" },
            "POST",
            "https://evil.example",
          ),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await createRequest(
          write("/api/requests", { type: "study", purpose: "Для работы", userId: "student-2" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await createRequest(
          new Request(origin + "/api/requests", {
            method: "POST",
            headers: { origin, "content-type": "application/json" },
            body: "{broken",
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await createRequest(write("/api/requests", { comment: "я".repeat(9000) }))).status,
    ).toBe(413);
    expect(
      (
        await readNotifications(
          write("/api/notifications/read", { id: "student-2-notification-0" }),
        )
      ).status,
    ).toBe(404);
  });

  it("enforces the durable creation quota and returns a retry header", async () => {
    await login("student-1");
    for (let index = 0; index < 20; index += 1)
      await consumeRateLimit(db, "api:create-request:student-1", 20, 3_600_000);
    const response = await createRequest(
      write("/api/requests", { type: "study", purpose: "Для работы" }),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect((await response.json()).error.code).toBe("RATE_LIMITED");
  });

  it("does not trust a stale staff role returned by the session", async () => {
    await login("staff-1");
    await db.execute("UPDATE users SET role = 'student' WHERE id = 'staff-1'");
    expect((await getQueue(read())).status).toBe(403);
    expect(
      (
        await updateRequest(
          write("/api/requests/a", { status: "processing" }, "PATCH"),
          ctx("student-1-request-study"),
        )
      ).status,
    ).toBe(403);
  });

  it("never discloses unexpected error messages or SQL details", async () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await api(async () => {
      throw new Error("secret database password");
    });
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret database password");
    expect(JSON.stringify(logger.mock.calls)).not.toContain("secret database password");
    expect(apiError(null).status).toBe(500);
  });
});
