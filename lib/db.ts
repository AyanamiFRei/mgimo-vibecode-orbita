import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

let database: Client | undefined;

export function databaseConfig(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const configured = env.DATABASE_URL?.trim();
  if (env.NODE_ENV === "production" && !configured) {
    throw new Error("DATABASE_URL must be configured in production.");
  }
  let url = configured || "file:./data/orbita.db";
  if (url.startsWith("file:")) {
    if (env.VERCEL) throw new Error("Vercel requires a persistent remote libSQL database.");
    const path = url.startsWith("file://") ? fileURLToPath(url) : resolve(url.slice(5));
    mkdirSync(dirname(path), { recursive: true });
    url = pathToFileURL(path).href;
  }
  return { url, authToken: env.DATABASE_AUTH_TOKEN, timeout: 5000 };
}

/** Lazy connection only. Schema and fictional demo data are created by `npm run db:setup`. */
export function getDb(): Client {
  database ??= createClient(databaseConfig());
  return database;
}

export async function createSchema(db: Client): Promise<void> {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, login TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student','staff')), disabled INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL, first_name TEXT NOT NULL, email TEXT NOT NULL, faculty TEXT NOT NULL,
      program TEXT NOT NULL, year INTEGER NOT NULL, group_name TEXT NOT NULL,
      student_number TEXT NOT NULL, avatar_color TEXT NOT NULL
    )`,
      `CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), date TEXT NOT NULL,
      start_time TEXT NOT NULL, end_time TEXT NOT NULL, subject TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('lecture','seminar','practice')), teacher TEXT NOT NULL,
      room TEXT NOT NULL, building TEXT NOT NULL, changed INTEGER NOT NULL DEFAULT 0, change_note TEXT
    )`,
      `CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), subject TEXT NOT NULL,
      teacher TEXT NOT NULL, score INTEGER NOT NULL, max_score INTEGER NOT NULL,
      grade TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('in_progress','passed','exam')),
      assessment TEXT NOT NULL, exam_date TEXT, credits INTEGER NOT NULL
    )`,
      `CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('study','scholarship','transcript','application')),
      title TEXT NOT NULL, purpose TEXT NOT NULL, comment TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('submitted','processing','ready','rejected')),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, due_at TEXT NOT NULL, staff_comment TEXT
    )`,
      `CREATE TABLE IF NOT EXISTS request_events (
      id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id),
      status TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL
    )`,
      `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
      body TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('schedule','request','deadline','news')),
      is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, href TEXT
    )`,
      `CREATE TABLE IF NOT EXISTS deadlines (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
      subject TEXT NOT NULL, due_at TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('assignment','exam','document'))
    )`,
      `CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
    )`,
      `CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS user_enrollments (
        user_id TEXT PRIMARY KEY REFERENCES users(id), program_key TEXT NOT NULL,
        persona_key TEXT NOT NULL, created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, title TEXT NOT NULL, department TEXT NOT NULL,
        subjects_json TEXT NOT NULL, avatar_color TEXT NOT NULL, office TEXT NOT NULL,
        office_hours TEXT NOT NULL, bio TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS teacher_threads (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), teacher_id TEXT NOT NULL REFERENCES teachers(id),
        subject TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        student_unread INTEGER NOT NULL DEFAULT 0, staff_unread INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS teacher_messages (
        id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES teacher_threads(id), sender_user_id TEXT REFERENCES users(id),
        sender_role TEXT NOT NULL CHECK(sender_role IN ('student','staff','system')), sender_name TEXT NOT NULL,
        body TEXT NOT NULL, created_at TEXT NOT NULL, is_simulation INTEGER NOT NULL DEFAULT 0
      )`,
      "CREATE INDEX IF NOT EXISTS teacher_threads_owner ON teacher_threads(user_id, updated_at DESC)",
      "CREATE INDEX IF NOT EXISTS teacher_messages_thread ON teacher_messages(thread_id, created_at)",
      "CREATE INDEX IF NOT EXISTS classes_user_date ON classes(user_id, date, start_time)",
      "CREATE INDEX IF NOT EXISTS grades_user ON grades(user_id)",
      "CREATE INDEX IF NOT EXISTS requests_user_created ON requests(user_id, created_at DESC)",
      "CREATE INDEX IF NOT EXISTS events_request ON request_events(request_id, created_at)",
      "CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at DESC)",
      "CREATE INDEX IF NOT EXISTS deadlines_user ON deadlines(user_id, due_at)",
      "CREATE INDEX IF NOT EXISTS rate_limits_expiration ON rate_limits(expires_at)",
    ],
    "write",
  );
  // Additive migration preserves all earlier lessons and private submissions.
  const columns = new Set(
    (await db.execute("PRAGMA table_info(classes)")).rows.map((row) => String(row.name)),
  );
  const additions = [
    ["teacher_id", "TEXT REFERENCES teachers(id)"],
    ["semester_id", "TEXT"],
    ["is_exam", "INTEGER NOT NULL DEFAULT 0"],
    ["generator_version", "TEXT"],
  ];
  const missing = additions.filter(([name]) => !columns.has(name));
  if (missing.length)
    await db.batch(
      missing.map(([name, type]) => `ALTER TABLE classes ADD COLUMN ${name} ${type}`),
      "write",
    );
  await db.execute({
    sql: "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES ('002-academics-and-contact', ?)",
    args: [new Date().toISOString()],
  });
}
