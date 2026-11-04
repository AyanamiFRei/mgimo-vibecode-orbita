import { createHash } from "node:crypto";
import type { Client } from "@libsql/client";
import { withDatabaseWrite } from "@/lib/database-write";

/** Atomic, persistent fixed-window limiter shared by all application instances. */
export async function consumeRateLimit(
  db: Client,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<boolean> {
  return withDatabaseWrite(db, async () => {
    const hashedKey = createHash("sha256").update(key).digest("hex");
    const result = await db.execute({
      sql: `INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET
          count = CASE WHEN rate_limits.expires_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
          expires_at = CASE WHEN rate_limits.expires_at <= ? THEN excluded.expires_at ELSE rate_limits.expires_at END
        RETURNING count`,
      args: [hashedKey, now + windowMs, now, now],
    });
    // A bounded cleanup prevents arbitrary login attempts from leaving permanent rows.
    await db.execute({
      sql: "DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at < ? LIMIT 100)",
      args: [now],
    });
    return Number(result.rows[0].count) <= limit;
  });
}
