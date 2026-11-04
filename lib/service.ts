import { randomUUID } from "node:crypto";
import type { Client, Row } from "@libsql/client";
import { withWriteTransaction } from "@/lib/database-write";
import { classFromRow } from "@/lib/academics";
import { calendarDay } from "@/lib/calendar";
import { AppError, notFound } from "@/lib/errors";
import { addDays, mondayInMoscow, requestDueAt } from "@/lib/time";
import { requireActor, requireRole, type SqlConnection } from "@/lib/users";
import {
  createRequestSchema,
  readNotificationsSchema,
  updateRequestSchema,
  validate,
} from "@/lib/validation";
import type {
  ClassItem,
  Deadline,
  Grade,
  Notification,
  PrintableDocument,
  QueueItem,
  RequestEvent,
  RequestStatus,
  RequestType,
  StudentRequest,
  Workspace,
} from "@/lib/types";

export const requestTitles: Record<RequestType, string> = {
  study: "Справка об обучении",
  scholarship: "Справка о стипендии",
  transcript: "Выписка об успеваемости",
  application: "Заявление в деканат",
};

const statusTitles: Record<RequestStatus, string> = {
  submitted: "Заявка принята",
  processing: "Заявка в работе",
  ready: "Документ готов",
  rejected: "Нужны уточнения по заявке",
};

const transitions: Record<RequestStatus, RequestStatus[]> = {
  submitted: ["processing", "rejected"],
  processing: ["ready", "rejected"],
  ready: [],
  rejected: [],
};

function nullable(value: unknown): string | null {
  return value == null ? null : String(value);
}

async function requestsFromRows(db: SqlConnection, rows: Row[]): Promise<StudentRequest[]> {
  if (!rows.length) return [];
  const events = await db.execute({
    sql: `SELECT id, request_id, status, note, created_at FROM request_events WHERE request_id IN (${rows.map(() => "?").join(",")}) ORDER BY created_at, rowid`,
    args: rows.map((row) => String(row.id)),
  });
  const grouped = new Map<string, RequestEvent[]>();
  for (const row of events.rows) {
    const id = String(row.request_id);
    const list = grouped.get(id) ?? [];
    list.push({
      id: String(row.id),
      status: row.status as RequestStatus,
      note: String(row.note),
      createdAt: String(row.created_at),
    });
    grouped.set(id, list);
  }
  return rows.map((row) => ({
    id: String(row.id),
    number: String(row.number),
    type: row.type as RequestType,
    title: String(row.title),
    purpose: String(row.purpose),
    comment: String(row.comment),
    status: row.status as RequestStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    dueAt: String(row.due_at),
    staffComment: nullable(row.staff_comment),
    events: grouped.get(String(row.id)) ?? [],
  }));
}

async function loadRequest(
  db: SqlConnection,
  actorId: string,
  id: string,
): Promise<StudentRequest> {
  const actor = await requireActor(db, actorId);
  const result = await db.execute({
    sql: "SELECT * FROM requests WHERE id = ? AND (user_id = ? OR ? = 'staff')",
    args: [id, actor.id, actor.role],
  });
  if (!result.rows[0]) notFound();
  return (await requestsFromRows(db, result.rows))[0];
}

/** All methods accept a verified actor ID, never client-provided ownership or role. */
export class CampusService {
  constructor(
    private readonly db: Client,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getWorkspace(actorId: string): Promise<Workspace> {
    const user = await requireActor(this.db, actorId);
    const weekStart = mondayInMoscow(this.clock());
    const results = await this.db.batch(
      [
        {
          sql: "SELECT * FROM classes WHERE user_id = ? AND date >= ? AND date < ? ORDER BY date, start_time, id",
          args: [actorId, weekStart, addDays(weekStart, 7)],
        },
        { sql: "SELECT * FROM grades WHERE user_id = ? ORDER BY rowid", args: [actorId] },
        {
          sql: "SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC, rowid DESC",
          args: [actorId],
        },
        {
          sql: "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, rowid DESC",
          args: [actorId],
        },
        {
          sql: "SELECT * FROM deadlines WHERE user_id = ? AND due_at >= ? ORDER BY due_at LIMIT 12",
          args: [actorId, `${weekStart}T00:00:00.000Z`],
        },
      ],
      "read",
    );
    const classes: ClassItem[] = results[0].rows
      .map(classFromRow)
      .filter((item) => ["study", "exam"].includes(calendarDay(item.date).kind));
    const grades: Grade[] = results[1].rows.map((row) => ({
      id: String(row.id),
      subject: String(row.subject),
      teacher: String(row.teacher),
      score: Number(row.score),
      maxScore: Number(row.max_score),
      grade: String(row.grade),
      status: row.status as Grade["status"],
      assessment: String(row.assessment),
      examDate: nullable(row.exam_date),
      credits: Number(row.credits),
    }));
    const notifications: Notification[] = results[3].rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      body: String(row.body),
      kind: row.kind as Notification["kind"],
      read: Boolean(row.is_read),
      createdAt: String(row.created_at),
      href: nullable(row.href),
    }));
    const deadlines: Deadline[] = results[4].rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      subject: String(row.subject),
      dueAt: String(row.due_at),
      kind: row.kind as Deadline["kind"],
    }));
    return {
      user,
      weekStart,
      classes,
      grades,
      requests: await requestsFromRows(this.db, results[2].rows),
      notifications,
      deadlines,
    };
  }

  async getRequest(actorId: string, id: string): Promise<StudentRequest> {
    return loadRequest(this.db, actorId, id);
  }

  async createRequest(actorId: string, input: unknown): Promise<StudentRequest> {
    const data = validate(createRequestSchema, input);
    const id = randomUUID();
    const now = this.clock();
    const timestamp = now.toISOString();
    const number = `О-${id.slice(0, 8).toUpperCase()}`;
    return withWriteTransaction(this.db, async (tx) => {
      requireRole(await requireActor(tx, actorId), "student");
      await tx.execute({
        sql: "INSERT INTO requests (id, number, user_id, type, title, purpose, comment, status, created_at, updated_at, due_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)",
        args: [
          id,
          number,
          actorId,
          data.type,
          requestTitles[data.type],
          data.purpose,
          data.comment,
          timestamp,
          timestamp,
          requestDueAt(now),
        ],
      });
      await tx.execute({
        sql: "INSERT INTO request_events (id, request_id, status, note, created_at) VALUES (?, ?, 'submitted', ?, ?)",
        args: [
          randomUUID(),
          id,
          "Заявка отправлена в деканат. Обычно отвечаем за 3 рабочих дня.",
          timestamp,
        ],
      });
      await tx.execute({
        sql: "INSERT INTO notifications (id, user_id, title, body, kind, created_at, href) VALUES (?, ?, ?, ?, 'request', ?, '/dashboard/documents')",
        args: [
          randomUUID(),
          actorId,
          "Заявка принята",
          `${requestTitles[data.type]} · ${number}. Следите за статусом в разделе документов.`,
          timestamp,
        ],
      });
      return loadRequest(tx, actorId, id);
    });
  }

  async updateRequest(actorId: string, id: string, input: unknown): Promise<StudentRequest> {
    const data = validate(updateRequestSchema, input);
    return withWriteTransaction(this.db, async (tx) => {
      requireRole(await requireActor(tx, actorId), "staff");
      const result = await tx.execute({ sql: "SELECT * FROM requests WHERE id = ?", args: [id] });
      const row = result.rows[0];
      if (!row) notFound();
      const previous = row.status as RequestStatus;
      if (previous === data.status) return loadRequest(tx, actorId, id);
      if (!transitions[previous].includes(data.status)) {
        throw new AppError(
          409,
          "INVALID_TRANSITION",
          "Статус уже изменился или этот переход недоступен. Обновите список.",
        );
      }
      const timestamp = this.clock().toISOString();
      const update = await tx.execute({
        sql: "UPDATE requests SET status = ?, staff_comment = ?, updated_at = ? WHERE id = ? AND status = ?",
        args: [data.status, data.comment || null, timestamp, id, previous],
      });
      if (update.rowsAffected !== 1)
        throw new AppError(409, "CONFLICT", "Заявка уже обновлена другим сотрудником.");
      const note = data.comment || statusTitles[data.status];
      await tx.execute({
        sql: "INSERT INTO request_events (id, request_id, status, note, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [randomUUID(), id, data.status, note, timestamp],
      });
      await tx.execute({
        sql: "INSERT INTO notifications (id, user_id, title, body, kind, created_at, href) VALUES (?, ?, ?, ?, 'request', ?, '/dashboard/documents')",
        args: [
          randomUUID(),
          String(row.user_id),
          statusTitles[data.status],
          `${row.title} · ${row.number}. ${note}`,
          timestamp,
        ],
      });
      return loadRequest(tx, actorId, id);
    });
  }

  async getQueue(actorId: string): Promise<QueueItem[]> {
    requireRole(await requireActor(this.db, actorId), "staff");
    const result = await this.db.execute(
      "SELECT r.*, u.name AS student_name, u.group_name AS student_group FROM requests r JOIN users u ON u.id = r.user_id ORDER BY CASE r.status WHEN 'submitted' THEN 0 WHEN 'processing' THEN 1 ELSE 2 END, r.created_at DESC",
    );
    const requests = await requestsFromRows(this.db, result.rows);
    return requests.map((request, index) => ({
      ...request,
      student: {
        id: String(result.rows[index].user_id),
        name: String(result.rows[index].student_name),
        group: String(result.rows[index].student_group),
      },
    }));
  }

  async markNotificationsRead(actorId: string, input: unknown): Promise<{ updated: number }> {
    const data = validate(readNotificationsSchema, input);
    return withWriteTransaction(this.db, async (tx) => {
      await requireActor(tx, actorId);
      if (data.id) {
        const existing = await tx.execute({
          sql: "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
          args: [data.id, actorId],
        });
        if (!existing.rows.length) notFound();
        const result = await tx.execute({
          sql: "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ? AND is_read = 0",
          args: [data.id, actorId],
        });
        return { updated: result.rowsAffected };
      }
      const result = await tx.execute({
        sql: "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
        args: [actorId],
      });
      return { updated: result.rowsAffected };
    });
  }

  async getDocument(actorId: string, id: string): Promise<PrintableDocument> {
    const request = await this.getRequest(actorId, id);
    if (request.status !== "ready")
      throw new AppError(
        409,
        "DOCUMENT_NOT_READY",
        "Документ пока не готов. Мы пришлём уведомление.",
      );
    const result = await this.db.execute({
      sql: "SELECT user_id FROM requests WHERE id = ?",
      args: [id],
    });
    const student = await requireActor(this.db, String(result.rows[0].user_id));
    return { request, student };
  }
}
