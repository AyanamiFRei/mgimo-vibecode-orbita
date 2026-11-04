import type { Client } from "@libsql/client";
import { z } from "zod";
import { classFromRow } from "@/lib/academics";
import { calendarDay, calendarNotes, isCalendarDate, semesters } from "@/lib/calendar";
import { AppError } from "@/lib/errors";
import { addDays, mondayInMoscow, moscowDate } from "@/lib/time";
import { requireActor } from "@/lib/users";
import { validate } from "@/lib/validation";
import type { ScheduleData } from "@/lib/types";

const querySchema = z
  .object({
    semester: z.enum(["autumn-2026", "spring-2027"]).optional(),
    week: z
      .string()
      .refine(isCalendarDate)
      .refine((value) => new Date(`${value}T12:00:00Z`).getUTCDay() === 1)
      .optional(),
  })
  .strict();

export async function getSchedule(
  db: Client,
  actorId: string,
  input: unknown,
  now = new Date(),
): Promise<ScheduleData> {
  await requireActor(db, actorId);
  const data = validate(querySchema, input);
  const today = moscowDate(now);
  const semester =
    semesters.find((item) => item.id === data.semester) ??
    semesters.find((item) => today >= item.startDate && today <= item.endDate) ??
    semesters[0];
  const firstWeek = mondayInMoscow(new Date(`${semester.startDate}T12:00:00+03:00`));
  const lastWeek = mondayInMoscow(new Date(`${semester.endDate}T12:00:00+03:00`));
  const currentWeek = mondayInMoscow(now);
  const weekStart =
    data.week ??
    (currentWeek < firstWeek ? firstWeek : currentWeek > lastWeek ? lastWeek : currentWeek);
  if (weekStart < firstWeek || weekStart > lastWeek)
    throw new AppError(400, "INVALID_WEEK", "Выберите неделю внутри выбранного семестра.");
  const rows = await db.execute({
    sql: "SELECT * FROM classes WHERE user_id=? AND date>=? AND date<? AND (semester_id=? OR semester_id IS NULL) ORDER BY date,start_time,id",
    args: [actorId, weekStart, addDays(weekStart, 7), semester.id],
  });
  const days = Array.from({ length: 7 }, (_, index) => calendarDay(addDays(weekStart, index)));
  const available = new Set(
    days.filter((day) => day.kind === "study" || day.kind === "exam").map((day) => day.date),
  );
  return {
    semesters,
    semester,
    weekStart,
    classes: rows.rows.map(classFromRow).filter((item) => available.has(item.date)),
    days,
    notes: calendarNotes,
  };
}
