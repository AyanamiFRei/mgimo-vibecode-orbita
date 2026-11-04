import type { Client, Row, Transaction } from "@libsql/client";
import { AppError } from "@/lib/errors";
import type { User } from "@/lib/types";

export type SqlConnection = Pick<Client | Transaction, "execute">;

export const publicUserColumns =
  "id, login, role, name, first_name, email, faculty, program, year, group_name, student_number, avatar_color";

export function userFromRow(row: Row): User {
  return {
    id: String(row.id),
    login: String(row.login),
    role: row.role as User["role"],
    name: String(row.name),
    firstName: String(row.first_name),
    email: String(row.email),
    faculty: String(row.faculty),
    program: String(row.program),
    year: Number(row.year),
    group: String(row.group_name),
    studentNumber: String(row.student_number),
    avatarColor: String(row.avatar_color),
  };
}

export async function findUser(db: SqlConnection, id: string): Promise<User | null> {
  const result = await db.execute({
    sql: `SELECT ${publicUserColumns} FROM users WHERE id = ? AND disabled = 0`,
    args: [id],
  });
  return result.rows[0] ? userFromRow(result.rows[0]) : null;
}

export async function requireActor(db: SqlConnection, id: string): Promise<User> {
  const user = await findUser(db, id);
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Войдите в кабинет, чтобы продолжить.");
  return user;
}

export function requireRole(user: User, role: User["role"]): void {
  if (user.role !== role)
    throw new AppError(403, "FORBIDDEN", "У вас нет доступа к этому действию.");
}
