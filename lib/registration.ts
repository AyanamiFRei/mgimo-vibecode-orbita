import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import type { Client } from "@libsql/client";
import { academicStatements } from "@/lib/academics";
import { personas, programs } from "@/lib/catalog";
import { withWriteTransaction } from "@/lib/database-write";
import { AppError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { validate } from "@/lib/validation";

export const registrationSchema = z
  .object({
    login: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(32)
      .regex(/^[a-z][a-z0-9_-]*$/),
    password: z
      .string()
      .min(12)
      .max(72)
      .refine((value) => Buffer.byteLength(value, "utf8") <= 72),
    program: z.enum(["business-informatics", "international-relations"]),
    persona: z.enum(["alisa", "mark", "nika", "lev"]),
  })
  .strict();

export async function registerStudent(
  db: Client,
  input: unknown,
  network = "shared",
  now = new Date(),
  bcryptRounds = 12,
): Promise<{ login: string }> {
  if (!(await consumeRateLimit(db, `register-network:${network}`, 30, 3_600_000, now.getTime())))
    throw new AppError(429, "RATE_LIMITED", "Слишком много попыток регистрации. Попробуйте позже.");
  const data = validate(registrationSchema, input);
  if (!(await consumeRateLimit(db, `register-login:${data.login}`, 5, 3_600_000, now.getTime())))
    throw new AppError(
      429,
      "RATE_LIMITED",
      "Слишком много попыток для этого логина. Попробуйте позже.",
    );
  const passwordHash = await hash(data.password, bcryptRounds);
  const id = `student-${randomUUID()}`;
  const persona = personas[data.persona];
  const program = programs[data.program];
  return withWriteTransaction(db, async (tx) => {
    const existing = await tx.execute({
      sql: "SELECT id FROM users WHERE login=?",
      args: [data.login],
    });
    if (existing.rows.length)
      throw new AppError(409, "LOGIN_TAKEN", "Этот логин уже занят. Выберите другой.");
    await tx.batch([
      {
        sql: "INSERT INTO users (id,login,password_hash,role,name,first_name,email,faculty,program,year,group_name,student_number,avatar_color) VALUES (?,?,?,'student',?,?,?,?,?,?,?,?,?)",
        args: [
          id,
          data.login,
          passwordHash,
          persona.name,
          persona.firstName,
          `${id}@students.unh.example`,
          program.faculty,
          program.name,
          program.year,
          program.group,
          `ДЕМО-${id.slice(8, 16).toUpperCase()}`,
          persona.avatarColor,
        ],
      },
      {
        sql: "INSERT INTO user_enrollments (user_id,program_key,persona_key,created_at) VALUES (?,?,?,?)",
        args: [id, data.program, data.persona, now.toISOString()],
      },
      ...academicStatements(id, data.program),
      {
        sql: "INSERT INTO notifications (id,user_id,title,body,kind,created_at,href) VALUES (?,?,?,?,'news',?,'/dashboard')",
        args: [
          randomUUID(),
          id,
          "Добро пожаловать в Орбиту",
          "Это ваш отдельный демонстрационный кабинет. Профиль, преподаватели, расписание и оценки вымышлены. Заявки и переписка будут сохраняться только в вашем кабинете.",
          now.toISOString(),
        ],
      },
    ]);
    return { login: data.login };
  });
}
