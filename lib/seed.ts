import { hash } from "bcryptjs";
import type { Client, InStatement } from "@libsql/client";
import { academicStatements, teacherSeedStatements } from "@/lib/academics";
import { personas, programs } from "@/lib/catalog";
import { withWriteTransaction } from "@/lib/database-write";
import { addDays, mondayInMoscow } from "@/lib/time";
import type { PersonaKey, ProgramKey } from "@/lib/types";

const demoStudents: {
  id: string;
  login: string;
  persona: PersonaKey;
  program: ProgramKey;
  number: string;
}[] = [
  {
    id: "student-1",
    login: "student1",
    persona: "alisa",
    program: "business-informatics",
    number: "УНГ-230417",
  },
  {
    id: "student-2",
    login: "student2",
    persona: "mark",
    program: "international-relations",
    number: "УНГ-240208",
  },
];

/** Reconciles generated academics; preserves every account password, submission, message and read marker. */
export async function seedDatabase(db: Client, now = new Date(), bcryptRounds = 12): Promise<void> {
  const passwordHash = await hash("OrbitDemo2026!", bcryptRounds);
  const week = mondayInMoscow(now);
  const statements: InStatement[] = [...teacherSeedStatements()];
  for (const [studentIndex, student] of demoStudents.entries()) {
    const persona = personas[student.persona];
    const program = programs[student.program];
    statements.push({
      sql: "INSERT OR IGNORE INTO users (id,login,password_hash,role,name,first_name,email,faculty,program,year,group_name,student_number,avatar_color) VALUES (?,?,?,'student',?,?,?,?,?,?,?,?,?)",
      args: [
        student.id,
        student.login,
        passwordHash,
        persona.name,
        persona.firstName,
        `${student.login}@students.unh.example`,
        program.faculty,
        program.name,
        program.year,
        program.group,
        student.number,
        persona.avatarColor,
      ],
    });
    statements.push({
      sql: "INSERT OR IGNORE INTO user_enrollments (user_id,program_key,persona_key,created_at) VALUES (?,?,?,?)",
      args: [student.id, student.program, student.persona, now.toISOString()],
    });
    const requests = [
      {
        suffix: "study",
        type: "study",
        title: "Справка об обучении",
        status: "ready",
        purpose: "По месту требования",
        days: -5,
      },
      {
        suffix: "scholarship",
        type: "scholarship",
        title: "Справка о стипендии",
        status: "processing",
        purpose: "Для оформления студенческой карты",
        days: -1,
      },
    ] as const;
    for (const [index, item] of requests.entries()) {
      const id = `${student.id}-request-${item.suffix}`;
      const created = new Date(`${addDays(week, item.days)}T10:00:00+03:00`).toISOString();
      const updated = new Date(`${addDays(week, item.days + 1)}T12:00:00+03:00`).toISOString();
      statements.push({
        sql: "INSERT OR IGNORE INTO requests (id,number,user_id,type,title,purpose,comment,status,created_at,updated_at,due_at,staff_comment) VALUES (?,?,?,?,?,?,'',?,?,?,?,?)",
        args: [
          id,
          `О-ДЕМО-${studentIndex + 1}${index + 1}07`,
          student.id,
          item.type,
          item.title,
          item.purpose,
          item.status,
          created,
          updated,
          new Date(`${addDays(week, item.days + 4)}T18:00:00+03:00`).toISOString(),
          item.status === "ready"
            ? "Демонстрационный документ готов к скачиванию."
            : "Сверяем данные. Сообщим, когда справка будет готова.",
        ],
      });
      const history =
        item.status === "ready"
          ? ["submitted", "processing", "ready"]
          : ["submitted", "processing"];
      history.forEach((status, eventIndex) =>
        statements.push({
          sql: "INSERT OR IGNORE INTO request_events (id,request_id,status,note,created_at) VALUES (?,?,?,?,?)",
          args: [
            `${id}-event-${eventIndex}`,
            id,
            status,
            ["Заявка принята", "Сотрудник готовит документ", "Документ готов к скачиванию"][
              eventIndex
            ],
            eventIndex === 0 ? created : updated,
          ],
        }),
      );
    }
    const notifications = [
      [
        "schedule",
        "Новая аудитория 11 ноября",
        `11 ноября занятие «${program.subjects[(3 + studentIndex) % 6]}» пройдёт в аудитории 412. Начало в 10:45.`,
        "/dashboard/schedule",
        0,
      ],
      [
        "request",
        "Ваша справка уже готова",
        "Справка об обучении доступна в документах. Её можно открыть и сохранить.",
        "/dashboard/documents",
        0,
      ],
      [
        "deadline",
        "Ваши ближайшие учебные сроки",
        "Этапы проектов и экзамены собраны на главной странице. Проверьте ближайший срок и оставьте время на подготовку.",
        "/dashboard",
        0,
      ],
      [
        "news",
        "Преподаватели теперь на связи",
        "В разделе преподавателей можно посмотреть часы консультаций и начать отдельную демонстрационную переписку.",
        "/dashboard/teachers",
        1,
      ],
    ] as const;
    notifications.forEach((item, index) =>
      statements.push({
        sql: "INSERT INTO notifications (id,user_id,title,body,kind,is_read,created_at,href) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,href=excluded.href",
        args: [
          `${student.id}-notification-${index}`,
          student.id,
          item[1],
          item[2],
          item[0],
          item[4],
          new Date(now.getTime() - index * 3_600_000).toISOString(),
          item[3],
        ],
      }),
    );
  }
  statements.push({
    sql: "INSERT OR IGNORE INTO users (id,login,password_hash,role,name,first_name,email,faculty,program,year,group_name,student_number,avatar_color) VALUES ('staff-1','dean',?,'staff','София Берегова','София','dean@unh.example','Студенческий офис','Работа со студентами',0,'Деканат','—','mint')",
    args: [passwordHash],
  });
  await withWriteTransaction(db, async (tx) => {
    await tx.batch(statements);
    const enrollments = await tx.execute("SELECT user_id,program_key FROM user_enrollments");
    for (const row of enrollments.rows) {
      const userId = String(row.user_id);
      const program = String(row.program_key) as ProgramKey;
      if (!Object.hasOwn(programs, program))
        throw new Error("Unknown academic program in enrollment.");
      await tx.batch(academicStatements(userId, program, true));
    }
    // Exact old seed deadlines only; externally added deadlines remain intact.
    for (const student of demoStudents) {
      const legacy = await tx.execute({
        sql: "SELECT id FROM deadlines WHERE user_id=?",
        args: [student.id],
      });
      const prefix = `${student.id}-deadline-`;
      const ids = legacy.rows
        .map((row) => String(row.id))
        .filter(
          (id) =>
            id.startsWith(prefix) && /^\d{4}-\d{2}-\d{2}-[012]$/.test(id.slice(prefix.length)),
        );
      if (ids.length)
        await tx.batch(
          ids.map((id) => ({
            sql: "DELETE FROM deadlines WHERE id=? AND user_id=?",
            args: [id, student.id],
          })),
        );
    }
    await tx.execute(
      "UPDATE notifications SET href='/dashboard'||href WHERE href IN ('/documents','/schedule','/notifications')",
    );
    await tx.execute("UPDATE notifications SET href='/dashboard' WHERE href='/'");
  });
}
