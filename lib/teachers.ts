import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Client, Row } from "@libsql/client";
import { programs } from "@/lib/catalog";
import { withWriteTransaction } from "@/lib/database-write";
import { notFound } from "@/lib/errors";
import { requireActor, requireRole, type SqlConnection } from "@/lib/users";
import { validate } from "@/lib/validation";
import type {
  ProgramKey,
  StaffTeacherThread,
  Teacher,
  TeacherConversation,
  TeacherMessage,
  TeacherThread,
  User,
} from "@/lib/types";

const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) }).strict();
const threadSchema = z
  .object({
    teacherId: z.string().min(1).max(80),
    subject: z.string().trim().min(3).max(120),
    body: z.string().trim().min(1).max(2000),
  })
  .strict();
const threadColumns = `t.*, (SELECT m.body FROM teacher_messages m WHERE m.thread_id=t.id AND m.sender_role<>'system' ORDER BY m.created_at DESC,m.rowid DESC LIMIT 1) AS last_message`;

function teacherFromRow(row: Row): Teacher {
  return {
    id: String(row.id),
    name: String(row.name),
    title: String(row.title),
    department: String(row.department),
    subjects: JSON.parse(String(row.subjects_json)) as string[],
    avatarColor: String(row.avatar_color),
    office: String(row.office),
    officeHours: String(row.office_hours),
    bio: String(row.bio),
    isFictional: true,
  };
}
function threadFromRow(row: Row, actor: User): TeacherThread {
  return {
    id: String(row.id),
    teacherId: String(row.teacher_id),
    subject: String(row.subject),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastMessage: row.last_message == null ? "" : String(row.last_message),
    unreadCount: Number(actor.role === "staff" ? row.staff_unread : row.student_unread),
  };
}
function messageFromRow(row: Row): TeacherMessage {
  return {
    id: String(row.id),
    senderRole: row.sender_role as TeacherMessage["senderRole"],
    senderName: String(row.sender_name),
    body: String(row.body),
    createdAt: String(row.created_at),
    isSimulation: Boolean(row.is_simulation),
  };
}
async function visibleThread(db: SqlConnection, actor: User, id: string): Promise<Row> {
  const rows = await db.execute({
    sql: `SELECT ${threadColumns} FROM teacher_threads t WHERE t.id=? AND (t.user_id=? OR ?='staff')`,
    args: [id, actor.id, actor.role],
  });
  if (!rows.rows[0]) notFound();
  return rows.rows[0];
}
async function conversation(
  db: SqlConnection,
  actor: User,
  id: string,
): Promise<TeacherConversation> {
  const thread = await visibleThread(db, actor, id);
  const teachers = await db.execute({
    sql: "SELECT * FROM teachers WHERE id=?",
    args: [String(thread.teacher_id)],
  });
  if (!teachers.rows[0]) notFound();
  const messages = await db.execute({
    sql: "SELECT * FROM teacher_messages WHERE thread_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100",
    args: [id],
  });
  return {
    thread: threadFromRow(thread, actor),
    teacher: teacherFromRow(teachers.rows[0]),
    messages: messages.rows.reverse().map(messageFromRow),
  };
}

export class TeacherService {
  constructor(
    private readonly db: Client,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getTeachers(actorId: string): Promise<Teacher[]> {
    const actor = await requireActor(this.db, actorId);
    const result = await this.db.execute("SELECT * FROM teachers ORDER BY id");
    const teachers = result.rows.map(teacherFromRow);
    if (actor.role === "staff") return teachers;
    const enrollment = await this.db.execute({
      sql: "SELECT program_key FROM user_enrollments WHERE user_id=?",
      args: [actorId],
    });
    const programKey = enrollment.rows[0]?.program_key as ProgramKey | undefined;
    const subjects = programKey && programs[programKey]?.subjects;
    return subjects
      ? teachers.map((teacher) => ({
          ...teacher,
          subjects: teacher.subjects.filter((subject) => subjects.includes(subject)),
        }))
      : teachers;
  }

  async listThreads(actorId: string): Promise<TeacherThread[]> {
    const actor = await requireActor(this.db, actorId);
    requireRole(actor, "student");
    const result = await this.db.execute({
      sql: `SELECT ${threadColumns} FROM teacher_threads t WHERE t.user_id=? ORDER BY t.updated_at DESC,t.rowid DESC LIMIT 50`,
      args: [actorId],
    });
    return result.rows.map((row) => threadFromRow(row, actor));
  }

  async getInbox(actorId: string): Promise<StaffTeacherThread[]> {
    const actor = await requireActor(this.db, actorId);
    requireRole(actor, "staff");
    const result = await this.db.execute(
      `SELECT ${threadColumns},u.name AS student_name,u.group_name AS student_group FROM teacher_threads t JOIN users u ON u.id=t.user_id ORDER BY (t.staff_unread>0) DESC,t.updated_at DESC,t.rowid DESC LIMIT 50`,
    );
    return result.rows.map((row) => ({
      ...threadFromRow(row, actor),
      student: {
        id: String(row.user_id),
        name: String(row.student_name),
        group: String(row.student_group),
      },
    }));
  }

  async getConversation(actorId: string, id: string): Promise<TeacherConversation> {
    return conversation(this.db, await requireActor(this.db, actorId), id);
  }

  async createThread(actorId: string, input: unknown): Promise<TeacherConversation> {
    const data = validate(threadSchema, input);
    return withWriteTransaction(this.db, async (tx) => {
      const actor = await requireActor(tx, actorId);
      requireRole(actor, "student");
      const teacher = await tx.execute({
        sql: "SELECT id FROM teachers WHERE id=?",
        args: [data.teacherId],
      });
      if (!teacher.rows.length) notFound();
      const id = randomUUID();
      const timestamp = this.clock().toISOString();
      await tx.batch([
        {
          sql: "INSERT INTO teacher_threads (id,user_id,teacher_id,subject,created_at,updated_at,staff_unread) VALUES (?,?,?,?,?,?,1)",
          args: [id, actorId, data.teacherId, data.subject, timestamp, timestamp],
        },
        {
          sql: "INSERT INTO teacher_messages (id,thread_id,sender_user_id,sender_role,sender_name,body,created_at) VALUES (?,?,?,'student',?,?,?)",
          args: [randomUUID(), id, actorId, actor.name, data.body, timestamp],
        },
        {
          sql: "INSERT INTO teacher_messages (id,thread_id,sender_role,sender_name,body,created_at,is_simulation) VALUES (?,?,'system','Орбита · системное сообщение',?,?,1)",
          args: [
            randomUUID(),
            id,
            "Демонстрационная переписка. Ваш вопрос сохранён в этом кабинете. Ответ появится, когда сотрудник войдёт под демоаккаунтом и ответит. Реальным преподавателям и на почту ничего не отправляется.",
            timestamp,
          ],
        },
      ]);
      return conversation(tx, actor, id);
    });
  }

  async sendMessage(actorId: string, id: string, input: unknown): Promise<TeacherMessage> {
    const data = validate(messageSchema, input);
    return withWriteTransaction(this.db, async (tx) => {
      const actor = await requireActor(tx, actorId);
      const thread = await visibleThread(tx, actor, id);
      const timestamp = this.clock().toISOString();
      const messageId = randomUUID();
      await tx.execute({
        sql: "INSERT INTO teacher_messages (id,thread_id,sender_user_id,sender_role,sender_name,body,created_at) VALUES (?,?,?,?,?,?,?)",
        args: [messageId, id, actorId, actor.role, actor.name, data.body, timestamp],
      });
      await tx.execute({
        sql:
          actor.role === "staff"
            ? "UPDATE teacher_threads SET updated_at=?,student_unread=student_unread+1,staff_unread=0 WHERE id=?"
            : "UPDATE teacher_threads SET updated_at=?,staff_unread=staff_unread+1,student_unread=0 WHERE id=?",
        args: [timestamp, id],
      });
      if (actor.role === "staff")
        await tx.execute({
          sql: "INSERT INTO notifications (id,user_id,title,body,kind,created_at,href) VALUES (?,?,?,?,'news',?,?)",
          args: [
            randomUUID(),
            String(thread.user_id),
            "Ответ в переписке с преподавателем",
            `${actor.name} · сотрудник: ${data.body.slice(0, 160)}`,
            timestamp,
            `/dashboard/teachers?thread=${id}`,
          ],
        });
      return {
        id: messageId,
        senderRole: actor.role,
        senderName: actor.name,
        body: data.body,
        createdAt: timestamp,
        isSimulation: false,
      };
    });
  }

  async markRead(actorId: string, id: string): Promise<{ updated: number }> {
    return withWriteTransaction(this.db, async (tx) => {
      const actor = await requireActor(tx, actorId);
      const thread = await visibleThread(tx, actor, id);
      const unread = Number(actor.role === "staff" ? thread.staff_unread : thread.student_unread);
      if (!unread) return { updated: 0 };
      await tx.execute({
        sql:
          actor.role === "staff"
            ? "UPDATE teacher_threads SET staff_unread=0 WHERE id=?"
            : "UPDATE teacher_threads SET student_unread=0 WHERE id=?",
        args: [id],
      });
      return { updated: 1 };
    });
  }
}
