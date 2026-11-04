import type { InStatement, Row } from "@libsql/client";
import { calendarDay, semesters, teachingWeekday } from "@/lib/calendar";
import { programs, teacherCatalog } from "@/lib/catalog";
import { addDays } from "@/lib/time";
import type { ClassItem, ProgramKey, SemesterId } from "@/lib/types";

export function teacherSeedStatements(): InStatement[] {
  return teacherCatalog.map((teacher) => ({
    sql: `INSERT INTO teachers (id,name,title,department,subjects_json,avatar_color,office,office_hours,bio)
      VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,title=excluded.title,
      department=excluded.department,subjects_json=excluded.subjects_json,avatar_color=excluded.avatar_color,
      office=excluded.office,office_hours=excluded.office_hours,bio=excluded.bio`,
    args: [
      teacher.id,
      teacher.name,
      teacher.title,
      teacher.department,
      JSON.stringify(teacher.subjects),
      teacher.avatarColor,
      teacher.office,
      teacher.officeHours,
      teacher.bio,
    ],
  }));
}

export function classFromRow(row: Row): ClassItem {
  return {
    id: String(row.id),
    date: String(row.date),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    subject: String(row.subject),
    type: Number(row.is_exam) === 1 ? "exam" : (row.type as ClassItem["type"]),
    teacher: String(row.teacher),
    teacherId: row.teacher_id == null ? null : String(row.teacher_id),
    ...(row.semester_id ? { semesterId: String(row.semester_id) as SemesterId } : {}),
    room: String(row.room),
    building: String(row.building),
    changed: Boolean(row.changed),
    changeNote: row.change_note == null ? null : String(row.change_note),
  };
}

/** Only catalog-generated rows are reconciled; user-created requests, messages and manual lessons are untouched. */
export function academicStatements(
  userId: string,
  programKey: ProgramKey,
  reconcile = false,
): InStatement[] {
  const statements: InStatement[] = [];
  const program = programs[programKey];
  const offset = programKey === "business-informatics" ? 0 : 1;
  if (reconcile) {
    statements.push({
      sql: "DELETE FROM classes WHERE user_id = ? AND generator_version = 'academic-v2'",
      args: [userId],
    });
    // Exact v1 seed identity; never a wildcard matching arbitrary lesson IDs.
    if (userId === "student-1" || userId === "student-2")
      statements.push({
        sql: "DELETE FROM classes WHERE user_id = ? AND id = user_id || '-' || date || '-' || substr(id, -1, 1) AND substr(id, -1, 1) IN ('0','1','2')",
        args: [userId],
      });
  }

  for (const semester of semesters) {
    for (let date = semester.startDate; date <= semester.teachingEndDate; date = addDays(date, 1)) {
      if (calendarDay(date).kind !== "study") continue;
      const day = teachingWeekday(date);
      const count = day === 0 || day === 2 ? 3 : 2;
      for (let slot = 0; slot < count; slot += 1) {
        const course = (day + slot + offset) % program.subjects.length;
        const teacher = teacherCatalog[course];
        const changed = date === "2026-11-11" && slot === 1;
        const times = [
          ["09:00", "10:30"],
          ["10:45", "12:15"],
          ["13:00", "14:30"],
        ];
        statements.push({
          sql: `INSERT OR IGNORE INTO classes (id,user_id,date,start_time,end_time,subject,type,teacher,room,building,changed,change_note,teacher_id,semester_id,is_exam,generator_version)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'academic-v2')`,
          args: [
            `acad-v2:${userId}:${date}:${slot}`,
            userId,
            date,
            times[slot][0],
            times[slot][1],
            program.subjects[course],
            slot === 0 ? "lecture" : slot === 1 ? "seminar" : "practice",
            teacher.name,
            changed ? "412" : `${2 + day}${10 + slot}`,
            "Главный корпус",
            changed ? 1 : 0,
            changed ? "Аудитория изменилась: 305 → 412. Время занятия прежнее." : null,
            teacher.id,
            semester.id,
          ],
        });
      }
      if (day === 4)
        statements.push({
          sql: "INSERT OR IGNORE INTO deadlines (id,user_id,title,subject,due_at,kind) VALUES (?,?,?,?,?,'assignment')",
          args: [
            `academic-deadline:${userId}:${date}`,
            userId,
            "Сдать этап командного проекта",
            program.subjects[1],
            new Date(`${date}T18:00:00+03:00`).toISOString(),
          ],
        });
    }
    const examDates =
      semester.id === "autumn-2026"
        ? ["2027-01-12", "2027-01-14", "2027-01-18", "2027-01-20"]
        : ["2027-06-08", "2027-06-10", "2027-06-16", "2027-06-18"];
    for (const [index, course] of [0, 1, 2, 4].entries()) {
      const date = examDates[index];
      const teacher = teacherCatalog[course];
      statements.push({
        sql: `INSERT OR IGNORE INTO classes (id,user_id,date,start_time,end_time,subject,type,teacher,room,building,teacher_id,semester_id,is_exam,generator_version)
          VALUES (?,?,?,?,?,?,'practice',?,?,?,?,?,1,'academic-v2')`,
        args: [
          `acad-v2:${userId}:${date}:exam`,
          userId,
          date,
          "10:00",
          "12:00",
          program.subjects[course],
          teacher.name,
          "401",
          "Главный корпус",
          teacher.id,
          semester.id,
        ],
      });
      statements.push({
        sql: "INSERT OR IGNORE INTO deadlines (id,user_id,title,subject,due_at,kind) VALUES (?,?,?,?,?,'exam')",
        args: [
          `academic-exam:${userId}:${date}`,
          userId,
          "Экзамен",
          program.subjects[course],
          new Date(`${date}T10:00:00+03:00`).toISOString(),
        ],
      });
    }
  }

  const scores = offset === 0 ? [88, 94, 76, 91, 85, 82] : [79, 86, 92, 74, 88, 90];
  program.subjects.forEach((subject, index) =>
    statements.push({
      sql: `INSERT INTO grades (id,user_id,subject,teacher,score,max_score,grade,status,assessment,exam_date,credits)
      VALUES (?,?,?,?,?,100,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET exam_date=excluded.exam_date`,
      args: [
        `${userId}-grade-${index}`,
        userId,
        subject,
        teacherCatalog[index].name,
        scores[index],
        [3, 5].includes(index) ? "Зачтено" : scores[index] >= 85 ? "5" : "4",
        [1, 3, 4, 5].includes(index) ? "passed" : index === 0 ? "exam" : "in_progress",
        [3, 5].includes(index) ? "Зачёт" : "Экзамен",
        index === 0 ? "2027-01-12" : index === 2 ? "2027-01-18" : null,
        3 + (index % 3),
      ],
    }),
  );
  return statements;
}
