import type { Client, Transaction } from "@libsql/client";

const tails = new WeakMap<Client, Promise<void>>();

/** Native SQLite executes synchronously: queue local writers so a busy wait cannot block a pending commit. */
export async function withDatabaseWrite<T>(db: Client, action: () => Promise<T>): Promise<T> {
  if (db.protocol !== "file") return action();
  const previous = tails.get(db) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  tails.set(db, current);
  await previous;
  try {
    return await action();
  } finally {
    release();
    if (tails.get(db) === current) tails.delete(db);
  }
}

export async function withWriteTransaction<T>(
  db: Client,
  action: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return withDatabaseWrite(db, async () => {
    const tx = await db.transaction("write");
    try {
      const result = await action(tx);
      await tx.commit();
      return result;
    } catch (error) {
      if (!tx.closed) await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  });
}
