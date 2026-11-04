import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    execArgv: ["--expose-gc"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: ["lib/types.ts"],
      reporter: ["text", "json-summary", "html"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
