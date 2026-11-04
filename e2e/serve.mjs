import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const env = {
  ...process.env,
  PORT: "3100",
  HOSTNAME: "127.0.0.1",
  NEXTAUTH_URL: "http://localhost:3100",
  DATABASE_URL: `file:./data/e2e-${randomUUID()}.db`,
  DATABASE_AUTH_TOKEN: "",
};
const prepared = spawnSync(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "scripts/setup-db.ts"],
  { env, stdio: "inherit" },
);
if (prepared.status !== 0) process.exit(prepared.status || 1);
const server = spawn(process.execPath, ["tooling/start.mjs"], { env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code || 0));
