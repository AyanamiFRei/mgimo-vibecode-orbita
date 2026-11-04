import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { compare } from "bcryptjs";
import { createSchema } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { registerStudent } from "@/lib/registration";
import { TeacherService } from "@/lib/teachers";
import { getSchedule } from "@/lib/schedule";
import { calendarDay, semesters } from "@/lib/calendar";
import { CampusService } from "@/lib/service";
import { authenticateCredentials } from "@/lib/credentials";
import { consumeRateLimit } from "@/lib/rate-limit";

let db: Client;
const now = new Date("2026-11-04T12:00:00Z");
const registration = {
  login: "new_student",
  password: "FictionalDemo2026!",
  program: "business-informatics",
  persona: "nika",
};
beforeEach(async () => {
  db = createClient({ url: "file::memory:" });
  await createSchema(db);
  await seedDatabase(db, now, 4);
});
afterEach(() => db.close());

describe("fictional registration", () => {
  it("creates a distinct bcrypt account with owned curriculum and empty private history", async () => {
    const result = await registerStudent(
      db,
      { ...registration, login: " New_Student " },
      "signup-test",
      now,
      4,
    );
    expect(result).toEqual({ login: "new_student" });
    const rows = await db.execute({
      sql: "SELECT * FROM users WHERE login = ?",
      args: [result.login],
    });
    const row = rows.rows[0];
    expect(row.role).toBe("student");
    expect(row.name).toBe("Ника Яснова");
    expect(row.email).toMatch(/@students\.unh\.example$/);
    expect(await compare(registration.password, String(row.password_hash))).toBe(true);
    const user = await authenticateCredentials(
      db,
      { login: result.login, password: registration.password },
      "signin-test",
      now,
    );
    expect(user?.id).toBe(row.id);
    const workspace = await new CampusService(db, () => now).getWorkspace(String(row.id));
    expect(workspace.requests).toEqual([]);
    expect(workspace.grades).toHaveLength(6);
    expect(workspace.notifications).toHaveLength(1);
    expect(workspace.notifications[0].title).toContain("Добро пожаловать");
    expect(JSON.stringify(workspace)).not.toMatch(/student-1|student-2|password_hash/);
    expect(
      (await getSchedule(db, String(row.id), { semester: "spring-2027", week: "2027-02-15" }, now))
        .classes.length,
    ).toBeGreaterThan(10);
    await expect(
      new CampusService(db).getRequest(String(row.id), "student-1-request-study"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects email, role, custom identity, weak passwords and bcrypt truncation", async () => {
    for (const input of [
      { ...registration, email: "real@example.com" },
      { ...registration, role: "staff" },
      { ...registration, name: "Настоящее имя" },
      { ...registration, persona: "invented" },
      { ...registration, password: "short" },
      { ...registration, password: "я".repeat(37) },
      { ...registration, login: "' OR 1=1 --" },
      { ...registration, program: "admin" },
    ])
      await expect(registerStudent(db, input, "validation", now, 4)).rejects.toMatchObject({
        status: 400,
      });
  });

  it("handles duplicate normalized logins and concurrent signup without partial accounts", async () => {
    const results = await Promise.allSettled([
      registerStudent(db, registration, "race-one", now, 4),
      registerStudent(db, { ...registration, login: "NEW_STUDENT" }, "race-two", now, 4),
    ]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((item) => item.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toMatchObject({
      status: 409,
      code: "LOGIN_TAKEN",
    });
    expect(
      (await db.execute("SELECT id FROM users WHERE login = 'new_student'")).rows,
    ).toHaveLength(1);
  });

  it("accepts a 72-byte password exactly and rejects a longer login password without bcrypt truncation", async () => {
    const password = "я".repeat(36);
    await registerStudent(db, { ...registration, password }, "password-boundary", now, 4);
    expect(
      await authenticateCredentials(
        db,
        { login: registration.login, password },
        "password-signin",
        now,
      ),
    ).toMatchObject({ login: registration.login });
    expect(
      await authenticateCredentials(
        db,
        { login: registration.login, password: password + "x" },
        "password-signin",
        now,
      ),
    ).toBeNull();
  });

  it("rolls back an entire account if academic provisioning fails and limits signup attempts", async () => {
    await db.execute(
      "CREATE TRIGGER fail_new_class BEFORE INSERT ON classes BEGIN SELECT RAISE(ABORT, 'provision failure'); END",
    );
    await expect(registerStudent(db, registration, "rollback", now, 4)).rejects.toThrow();
    expect(
      (await db.execute("SELECT id FROM users WHERE login = 'new_student'")).rows,
    ).toHaveLength(0);
    await db.execute("DROP TRIGGER fail_new_class");
    for (let index = 0; index < 30; index += 1)
      await consumeRateLimit(db, "register-network:blocked", 30, 3_600_000, now.getTime());
    await expect(registerStudent(db, registration, "blocked", now, 4)).rejects.toMatchObject({
      status: 429,
    });
  });
});

describe("semester calendar and reconciliation", () => {
  it("has both semesters, official non-working dates and the transferred Saturday", async () => {
    expect(semesters).toHaveLength(2);
    for (const date of [
      "2026-11-04",
      "2026-12-31",
      "2027-01-01",
      "2027-01-08",
      "2027-02-22",
      "2027-02-23",
      "2027-03-08",
      "2027-05-03",
      "2027-05-10",
      "2027-06-14",
    ]) {
      expect(calendarDay(date).kind).toBe("holiday");
      expect(calendarDay(date).sourceUrl).toBeTruthy();
    }
    expect(calendarDay("2027-02-20").kind).toBe("study");
    expect(calendarDay("2026-12-28").kind).toBe("vacation");
    expect(calendarDay("2027-01-12").kind).toBe("exam");
    const week = await getSchedule(
      db,
      "student-1",
      { semester: "spring-2027", week: "2027-02-15" },
      now,
    );
    expect(week.classes.some((item) => item.date === "2027-02-20")).toBe(true);
    expect(
      week.classes.filter((item) => item.date === "2027-02-20").map((item) => item.subject),
    ).toEqual(
      week.classes.filter((item) => item.date === "2027-02-15").map((item) => item.subject),
    );
    const holidayWeek = await getSchedule(
      db,
      "student-1",
      { semester: "spring-2027", week: "2027-02-22" },
      now,
    );
    expect(
      holidayWeek.classes.some((item) => ["2027-02-22", "2027-02-23"].includes(item.date)),
    ).toBe(false);
  });

  it("limits range, validates real Monday dates, and isolates students", async () => {
    const first = await getSchedule(
      db,
      "student-1",
      { semester: "autumn-2026", week: "2026-11-02" },
      now,
    );
    const second = await getSchedule(
      db,
      "student-2",
      { semester: "autumn-2026", week: "2026-11-02" },
      now,
    );
    expect(first.classes.length).toBeGreaterThan(0);
    expect(first.classes.length).toBeLessThan(20);
    expect(first.classes[0].subject).not.toBe(second.classes[0].subject);
    expect(first.classes.every((item) => item.teacherId && item.semesterId === "autumn-2026")).toBe(
      true,
    );
    expect(first.classes.some((item) => item.date === "2026-11-04")).toBe(false);
    const dashboard = await new CampusService(db, () => now).getWorkspace("student-1");
    expect(dashboard.classes).toEqual(first.classes);
    for (const input of [
      { semester: "bad" },
      { semester: "spring-2027", week: "2027-02-30" },
      { semester: "spring-2027", week: "2027-02-16" },
      { semester: "spring-2027", week: "2030-02-04" },
      { semester: "spring-2027", userId: "student-2" },
    ]) {
      await expect(getSchedule(db, "student-1", input, now)).rejects.toMatchObject({ status: 400 });
    }
    await expect(
      getSchedule(db, "missing", { semester: "spring-2027" }, now),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("clamps default weeks, exposes actual exam slots, and keeps schema upgrades idempotent", async () => {
    const first = await getSchedule(
      db,
      "student-1",
      { semester: "autumn-2026" },
      new Date("2026-08-01T12:00:00Z"),
    );
    expect(first.weekStart).toBe("2026-08-31");
    expect(first.classes.every((item) => item.date >= "2026-09-01")).toBe(true);
    const last = await getSchedule(
      db,
      "student-1",
      { semester: "spring-2027" },
      new Date("2027-08-01T12:00:00Z"),
    );
    expect(last.weekStart).toBe("2027-06-28");
    expect(last.days.find((day) => day.date === "2027-07-01")?.kind).toBe("vacation");
    const exams = await getSchedule(
      db,
      "student-1",
      { semester: "spring-2027", week: "2027-06-07" },
      now,
    );
    expect(exams.classes.some((item) => item.type === "exam")).toBe(true);
    const changed = await getSchedule(
      db,
      "student-1",
      { semester: "autumn-2026", week: "2026-11-09" },
      now,
    );
    expect(changed.classes.some((item) => item.date === "2026-11-11" && item.changed)).toBe(true);
    await createSchema(db);
    expect(
      (await getSchedule(db, "student-1", { semester: "spring-2027", week: "2027-06-07" }, now))
        .classes,
    ).toEqual(exams.classes);
  });

  it("reconciles only generated classes and preserves submitted requests and manual lessons", async () => {
    const request = await new CampusService(db, () => now).createRequest("student-1", {
      type: "study",
      purpose: "Для стажировки",
    });
    await db.execute(
      "INSERT INTO classes (id,user_id,date,start_time,end_time,subject,type,teacher,room,building) VALUES ('manual-class','student-1','2026-11-05','17:00','18:00','Консультация','practice','Вера Лунова','201','Главный корпус')",
    );
    await db.execute(
      "INSERT INTO classes (id,user_id,date,start_time,end_time,subject,type,teacher,room,building) VALUES ('student-1-2026-11-04-0','student-1','2026-11-04','09:00','10:00','Устаревшая пара','lecture','Вера Лунова','201','Главный корпус')",
    );
    await seedDatabase(db, now, 4);
    await seedDatabase(db, now, 4);
    expect((await db.execute("SELECT id FROM classes WHERE id='manual-class'")).rows).toHaveLength(
      1,
    );
    expect(
      (await db.execute("SELECT id FROM classes WHERE id='student-1-2026-11-04-0'")).rows,
    ).toHaveLength(0);
    expect((await new CampusService(db).getRequest("student-1", request.id)).status).toBe(
      "submitted",
    );
    expect(
      (
        await db.execute(
          "SELECT date,start_time,COUNT(*) AS n FROM classes WHERE user_id='student-1' AND id LIKE 'acad-v2:%' GROUP BY date,start_time HAVING n > 1",
        )
      ).rows,
    ).toHaveLength(0);
  });
});

describe("private teacher contact", () => {
  it("lists fictional teachers and creates only the current student's conversation", async () => {
    const service = new TeacherService(db, () => now);
    const teachers = await service.getTeachers("student-1");
    expect(teachers).toHaveLength(6);
    expect(
      teachers.every(
        (teacher) => teacher.isFictional && teacher.officeHours && teacher.subjects.length,
      ),
    ).toBe(true);
    const conversation = await service.createThread("student-1", {
      teacherId: teachers[0].id,
      subject: "Вопрос о проекте",
      body: "Как выбрать тему проекта?",
    });
    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0]).toMatchObject({
      senderRole: "student",
      senderName: "Алиса Миронова",
      isSimulation: false,
    });
    expect(conversation.messages[1]).toMatchObject({ senderRole: "system", isSimulation: true });
    expect((await service.listThreads("student-1"))[0].id).toBe(conversation.thread.id);
    expect(await service.listThreads("student-2")).toEqual([]);
    await expect(
      service.getConversation("student-2", conversation.thread.id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.sendMessage("student-2", conversation.thread.id, { body: "Чужое сообщение" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(service.markRead("student-2", conversation.thread.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.getInbox("student-1")).rejects.toMatchObject({ status: 403 });
  });

  it("allows a real staff-account reply and isolated unread/notification state", async () => {
    let clock = now;
    const service = new TeacherService(db, () => clock);
    const thread = await service.createThread("student-1", {
      teacherId: "teacher-1",
      subject: "Время консультации",
      body: "Можно прийти в четверг?",
    });
    expect((await service.getInbox("staff-1"))[0]).toMatchObject({
      student: { id: "student-1" },
      unreadCount: 1,
    });
    clock = new Date(now.getTime() + 1000);
    const reply = await service.sendMessage("staff-1", thread.thread.id, {
      body: "Да, приходите в часы консультации.",
    });
    expect(reply).toMatchObject({
      senderRole: "staff",
      senderName: "София Берегова",
      isSimulation: false,
    });
    expect((await service.listThreads("student-1"))[0].unreadCount).toBe(1);
    await service.getConversation("student-1", thread.thread.id);
    expect((await service.listThreads("student-1"))[0].unreadCount).toBe(1);
    expect(await service.markRead("student-1", thread.thread.id)).toEqual({ updated: 1 });
    expect((await service.listThreads("student-1"))[0].unreadCount).toBe(0);
    expect(
      (await new CampusService(db, () => now).getWorkspace("student-1")).notifications.some(
        (item) => item.href?.includes(thread.thread.id),
      ),
    ).toBe(true);
    expect(
      (await new CampusService(db, () => now).getWorkspace("student-2")).notifications.some(
        (item) => item.href?.includes(thread.thread.id),
      ),
    ).toBe(false);
  });

  it("records student follow-up, staff read state and disabled-account denial", async () => {
    const service = new TeacherService(db, () => now);
    expect((await service.getTeachers("staff-1"))[0].subjects).toHaveLength(2);
    const thread = await service.createThread("student-1", {
      teacherId: "teacher-1",
      subject: "Консультация",
      body: "Первый вопрос",
    });
    expect(await service.markRead("staff-1", thread.thread.id)).toEqual({ updated: 1 });
    expect(await service.markRead("staff-1", thread.thread.id)).toEqual({ updated: 0 });
    const message = await service.sendMessage("student-1", thread.thread.id, {
      body: "Уточнение к вопросу",
    });
    expect(message.senderRole).toBe("student");
    expect((await service.getInbox("staff-1"))[0].unreadCount).toBe(1);
    expect((await service.getConversation("student-1", thread.thread.id)).thread.lastMessage).toBe(
      "Уточнение к вопросу",
    );
    await expect(service.getConversation("student-1", "missing")).rejects.toMatchObject({
      status: 404,
    });
    await db.execute("UPDATE users SET disabled=1 WHERE id='student-1'");
    await expect(service.listThreads("student-1")).rejects.toMatchObject({ status: 401 });
    await expect(
      service.sendMessage("student-1", thread.thread.id, { body: "Недоступный текст" }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rejects forged senders and reloads role before staff access", async () => {
    const service = new TeacherService(db, () => now);
    for (const input of [
      { teacherId: "teacher-1", subject: "Вопрос", body: "Текст", userId: "student-2" },
      { teacherId: "missing", subject: "Вопрос", body: "Текст" },
      { teacherId: "teacher-1", subject: "x".repeat(121), body: "Текст" },
    ]) {
      await expect(service.createThread("student-1", input)).rejects.toThrow();
    }
    await expect(
      service.createThread("staff-1", { teacherId: "teacher-1", subject: "Вопрос", body: "Текст" }),
    ).rejects.toMatchObject({ status: 403 });
    const thread = await service.createThread("student-1", {
      teacherId: "teacher-1",
      subject: "Вопрос",
      body: "Текст",
    });
    await expect(
      service.sendMessage("student-1", thread.thread.id, { body: "Текст", senderRole: "staff" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.sendMessage("student-1", thread.thread.id, { body: " " }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.sendMessage("student-1", thread.thread.id, { body: "x".repeat(2001) }),
    ).rejects.toMatchObject({ status: 400 });
    await db.execute("UPDATE users SET role='student' WHERE id='staff-1'");
    await expect(service.getInbox("staff-1")).rejects.toMatchObject({ status: 403 });
    await expect(
      service.sendMessage("staff-1", thread.thread.id, { body: "Текст" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("atomically rolls back a reply when its notification fails", async () => {
    const service = new TeacherService(db, () => now);
    const thread = await service.createThread("student-1", {
      teacherId: "teacher-1",
      subject: "Вопрос",
      body: "Текст",
    });
    await db.execute(
      "CREATE TRIGGER fail_reply_notification BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT, 'notification failure'); END",
    );
    await expect(
      service.sendMessage("staff-1", thread.thread.id, { body: "Ответ" }),
    ).rejects.toThrow();
    const unchanged = await service.getConversation("student-1", thread.thread.id);
    expect(unchanged.messages).toHaveLength(2);
    expect(unchanged.thread.unreadCount).toBe(0);
  });
});
