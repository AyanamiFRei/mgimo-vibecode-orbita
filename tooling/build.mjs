import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";

const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit",
  env: process.env,
});
if (result.status !== 0) process.exit(result.status || 1);
mkdirSync(".next/standalone/.next", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true });
