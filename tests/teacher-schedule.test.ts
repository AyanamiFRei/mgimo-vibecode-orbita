import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/teachers/[id]/schedule/route";
import { getSessionUser } from "@/lib/auth";
import { programs } from "@/lib/catalog";
import { createSchema } from "@/lib/db";
import { registerStudent } from "@/lib/registration";
import { getSchedule } from "@/lib/schedule";
import { seedDatabase } from "@/lib/seed";
import { getTeacherSchedule, mergeTeacherClasses } from "@/lib/teacher-schedule";
import { TeacherService } from "@/lib/teachers";
import type { ClassItem } from "@/lib/types";
import { requireActor } from "@/lib/users";

let db: Client;
const now = new Date("2026-11-10T12:00:00Z");
const week = { semester: "autumn-2026", week: "2026-11-09" };
vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/db", async (original) => ({
  ...(await original<typeof import("@/lib/db")>()),
  getDb: () => db,
}));

beforeEach(async () => {
  db = createClient({ url: "file::memory:" });
  await createSchema(db);
  await seedDatabase(db, now, 4);
});
afterEach(() => db.close());

describe("teacher profiles and schedules", () => {
  it("serves a private week to a signed-in viewer and uses HTTP errors for invalid requests", async () => {
    const read = (id: string, monday = week.week) =>
      GET(
        new Request(
          `http://localhost/api/teachers/${id}/schedule?semester=${week.semester}&week=${monday}`,
        ),
        { params: Promise.resolve({ id }) },
      );
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await read("teacher-1")).status).toBe(401);
    vi.mocked(getSessionUser).mockResolvedValue(await requireActor(db, "student-1"));
    expect((await read("missing")).status).toBe(404);
    expect((await read("teacher-1", "2026-11-10")).status).toBe(400);
    const response = await read("teacher-1");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("private, no-store");
    expect((await response.json()).data).toMatchObject({
      weekStart: week.week,
      days: expect.any(Array),
    });
  });

  it("opens the full profile while the student's directory shows their own courses", async () => {
    const teachers = new TeacherService(db);
    const profile = await teachers.findTeacher("student-1", "teacher-1");
    expect(profile?.subjects).toEqual(["Анализ данных", "Международные отношения"]);
    expect((await teachers.getTeachers("student-1"))[0].subjects).toEqual(["Анализ данных"]);
    expect(await teachers.findTeacher("student-1", "missing")).toBeNull();
    await expect(teachers.findTeacher("missing", "teacher-1")).rejects.toMatchObject({
      status: 401,
    });
  });

  it("matches both groups' lessons and stays identical after another student registers", async () => {
    const teacherId = "teacher-4";
    const schedule = await getTeacherSchedule(db, "student-1", teacherId, week, now);
    const expected = [];
    for (const [actor, group] of [
      ["student-1", programs["business-informatics"].group],
      ["student-2", programs["international-relations"].group],
    ]) {
      const student = await getSchedule(db, actor, week, now);
      for (const lesson of student.classes.filter((item) => item.teacherId === teacherId))
        expected.push({ ...lesson, id: expect.any(String), groups: [group] });
    }
    expect(expected.length).toBeGreaterThan(1);
    expect(schedule.classes).toHaveLength(expected.length);
    expect(schedule.classes).toEqual(expect.arrayContaining(expected));
    expect(JSON.stringify(schedule)).not.toMatch(/student-1|student-2|Алиса|Северин|students\.unh/);
    await registerStudent(
      db,
      {
        login: "extra_schedule_user",
        persona: "nika",
        program: "business-informatics",
        password: "StudySchedule2026!",
      },
      "extra-user",
      now,
      4,
    );
    expect(await getTeacherSchedule(db, "staff-1", teacherId, week, now)).toEqual(schedule);
    await db.execute("DELETE FROM classes WHERE teacher_id='teacher-4'");
    expect(await getTeacherSchedule(db, "student-2", teacherId, week, now)).toEqual(schedule);
  });

  it("validates the viewer, teacher and week, and excludes holidays", async () => {
    await expect(getTeacherSchedule(db, "student-1", "missing", week)).rejects.toMatchObject({
      status: 404,
    });
    await expect(getTeacherSchedule(db, "missing", "teacher-1", week)).rejects.toMatchObject({
      status: 401,
    });
    for (const input of [
      { ...week, week: "2026-11-10" },
      { ...week, week: "2027-02-01" },
      { ...week, userId: "student-2" },
    ]) {
      await expect(getTeacherSchedule(db, "student-1", "teacher-1", input)).rejects.toMatchObject({
        status: 400,
      });
    }
    const holiday = await getTeacherSchedule(db, "student-1", "teacher-1", {
      ...week,
      week: "2026-11-02",
    });
    expect(holiday.days.find((day) => day.date === "2026-11-04")?.kind).toBe("holiday");
    expect(holiday.classes.some((lesson) => lesson.date === "2026-11-04")).toBe(false);
    await db.execute("UPDATE users SET disabled=1 WHERE id='student-1'");
    await expect(getTeacherSchedule(db, "student-1", "teacher-1", week)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("combines groups only when all teaching details match", () => {
    const lesson: ClassItem = {
      id: "first",
      date: "2026-11-09",
      startTime: "09:00",
      endTime: "10:30",
      type: "lecture",
      teacherId: "teacher-1",
      teacher: "Вера Лунова",
      subject: "Анализ данных",
      room: "205",
      building: "Главный корпус",
      changed: false,
      changeNote: null,
      semesterId: "autumn-2026",
      groups: ["БИ-23-01"],
    };
    const shared = { ...lesson, id: "second", groups: ["МО-24-02"] };
    const different = [
      { ...shared, id: "subject", subject: "Мировая экономика" },
      { ...shared, id: "room", room: "207" },
      { ...shared, id: "end", endTime: "10:00" },
      { ...shared, id: "type", type: "seminar" as const },
    ];
    const result = mergeTeacherClasses([lesson, shared, { ...shared }, ...different]);
    expect(result).toHaveLength(5);
    expect(result).toContainEqual({ ...lesson, groups: ["БИ-23-01", "МО-24-02"] });
    for (const distinct of different) expect(result).toContainEqual(distinct);
  });

  it("allocates separate rooms and exam slots and reconciles existing exam deadlines", async () => {
    const collisions = await db.execute(`
      SELECT a.date FROM classes a JOIN classes b ON b.date=a.date AND a.start_time<b.end_time AND b.start_time<a.end_time
      WHERE a.user_id='student-1' AND b.user_id='student-2' AND
        ((a.building=b.building AND a.room=b.room) OR a.teacher_id=b.teacher_id)
    `);
    expect(collisions.rows).toHaveLength(0);
    const examWeek = { semester: "spring-2027", week: "2027-06-07" };
    const exams = (await getTeacherSchedule(db, "student-1", "teacher-1", examWeek)).classes;
    expect(exams.map((item) => [item.type, item.startTime, item.endTime])).toEqual([
      ["exam", "10:00", "12:00"],
      ["exam", "13:00", "15:00"],
    ]);
    const examId = "academic-exam:student-2:2027-06-08";
    await db.execute({
      sql: "UPDATE deadlines SET due_at='2027-06-08T07:00:00.000Z' WHERE id=?",
      args: [examId],
    });
    await seedDatabase(db, now, 4);
    await seedDatabase(db, now, 4);
    const deadline = await db.execute({
      sql: "SELECT due_at FROM deadlines WHERE id=?",
      args: [examId],
    });
    expect(deadline.rows[0].due_at).toBe("2027-06-08T10:00:00.000Z");
    const notice = await db.execute(
      "SELECT body FROM notifications WHERE id='student-2-notification-0'",
    );
    const changed = (await getSchedule(db, "student-2", week)).classes.find(
      (item) => item.changed,
    )!;
    expect(String(notice.rows[0].body)).toContain(changed.room);
    expect(String(notice.rows[0].body)).toContain(changed.subject);
  });
});
