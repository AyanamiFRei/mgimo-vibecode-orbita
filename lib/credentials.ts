import { compare } from "bcryptjs";
import { z } from "zod";
import type { Client } from "@libsql/client";
import { consumeRateLimit } from "@/lib/rate-limit";
import { userFromRow } from "@/lib/users";
import type { User } from "@/lib/types";

const credentialsSchema = z.object({
  login: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/),
  password: z
    .string()
    .min(1)
    .max(72)
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72),
});

// Valid bcrypt hash used only to spend a comparable amount of work for unknown accounts.
const dummyHash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxdpGxxbNGQ3QVSKkmd4MjWXq6K";

export async function authenticateCredentials(
  db: Client,
  input: unknown,
  network = "shared",
  now = new Date(),
): Promise<User | null> {
  // Limit malformed input as well, before parsing or bcrypt work.
  if (!(await consumeRateLimit(db, `login-network:${network}`, 120, 15 * 60_000, now.getTime())))
    return null;
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return null;
  const { login, password } = parsed.data;
  if (!(await consumeRateLimit(db, `login-account:${login}`, 10, 15 * 60_000, now.getTime())))
    return null;
  const result = await db.execute({ sql: "SELECT * FROM users WHERE login = ?", args: [login] });
  const row = result.rows[0];
  const matches = await compare(password, row ? String(row.password_hash) : dummyHash);
  if (!row || Number(row.disabled) !== 0 || !matches) return null;
  return userFromRow(row);
}
