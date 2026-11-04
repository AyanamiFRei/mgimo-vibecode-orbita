import { existsSync } from "node:fs";
import { getDb, createSchema } from "../lib/db";
import { seedDatabase } from "../lib/seed";

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const db = getDb();
  try {
    await createSchema(db);
    await seedDatabase(db);
    console.log("Орбита: база готова. Существующие заявки и статусы сохранены.");
    console.log("Демоаккаунты: student1, student2, dean. Пароль: OrbitDemo2026!");
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Не удалось подготовить базу данных:",
    error instanceof Error ? error.message : "неизвестная ошибка",
  );
  process.exitCode = 1;
});
