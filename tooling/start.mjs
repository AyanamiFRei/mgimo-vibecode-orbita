import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
// The standalone server changes cwd; resolve a local database before that happens.
if (
  process.env.DATABASE_URL?.startsWith("file:") &&
  !process.env.DATABASE_URL.startsWith("file://")
) {
  process.env.DATABASE_URL = pathToFileURL(resolve(process.env.DATABASE_URL.slice(5))).href;
}
if (!existsSync(".next/standalone/server.js")) throw new Error("Сначала выполните npm run build.");
await import(pathToFileURL(resolve(".next/standalone/server.js")).href);
