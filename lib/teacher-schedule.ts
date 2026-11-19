import type { Client } from "@libsql/client";
import { programLessonsForDay } from "@/lib/academics";
import { programs } from "@/lib/catalog";
import { notFound } from "@/lib/errors";
import { scheduleWeek } from "@/lib/schedule";
import { TeacherService } from "@/lib/teachers";
import type { ClassItem, ProgramKey, ScheduleData } from "@/lib/types";

export function mergeTeacherClasses(lessons: ClassItem[]): ClassItem[] {
  const classes = new Map<string, ClassItem>();
  for (const lesson of lessons) {
    const identity = JSON.stringify([
      lesson.semesterId,
      lesson.date,
      lesson.startTime,
      lesson.endTime,
      lesson.subject,
      lesson.type,
      lesson.teacherId,
      lesson.teacher,
      lesson.room,
      lesson.building,
      lesson.changed,
      lesson.changeNote,
    ]);
    const existing = classes.get(identity);
    if (!existing) classes.set(identity, { ...lesson });
    else existing.groups = [...new Set([...(existing.groups ?? []), ...(lesson.groups ?? [])])];
  }
  return [...classes.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime) ||
      a.id.localeCompare(b.id),
  );
}

export async function getTeacherSchedule(
  db: Client,
  actorId: string,
  teacherId: string,
  input: unknown,
  now = new Date(),
): Promise<ScheduleData> {
  if (!(await new TeacherService(db).findTeacher(actorId, teacherId))) notFound();
  const week = scheduleWeek(input, now);
  const lessons: ClassItem[] = [];
  for (const program of Object.keys(programs) as ProgramKey[]) {
    for (const { date } of week.days) {
      for (const { slot, ...lesson } of programLessonsForDay(program, week.semester, date)) {
        if (lesson.teacherId === teacherId)
          lessons.push({
            ...lesson,
            id: `${program}:${date}:${slot}`,
            groups: [programs[program].group],
          });
      }
    }
  }
  return { ...week, classes: mergeTeacherClasses(lessons) };
}
