import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { createSchema, databaseConfig } from "@/lib/db";
import { assertSameOrigin, readJsonBody } from "@/lib/security";
import { requestDueAt } from "@/lib/time";
import { authenticateCredentials } from "@/lib/credentials";
import { consumeRateLimit } from "@/lib/rate-limit";
import { seedDatabase } from "@/lib/seed";
import { CampusService } from "@/lib/service";
import { escapeHtml } from "@/lib/document";

let db: Client | undefined;
afterEach(() => db?.close());

describe("deployment and boundary conditions", () => {
  it("requires explicit production storage and forbids ephemeral file storage on Vercel", async () => {
    expect(() => databaseConfig({ NODE_ENV: "production" })).toThrow(/DATABASE_URL/);
    expect(() =>
      databaseConfig({ NODE_ENV: "production", DATABASE_URL: "file:./data.db", VERCEL: "1" }),
    ).toThrow(/persistent/);
    expect(
      databaseConfig({ DATABASE_URL: "libsql://test.example", DATABASE_AUTH_TOKEN: "test-token" })
        .url,
    ).toBe("libsql://test.example");
    const dir = await mkdtemp(join(tmpdir(), "orbita-config-"));
    const config = databaseConfig({ DATABASE_URL: "file:" + join(dir, "nested", "test.db") });
    expect(config.url).toContain("test.db");
    expect(databaseConfig({ DATABASE_URL: config.url }).url).toBe(config.url);
    await rm(dir, { recursive: true });
  });

  it("fails closed when canonical origin is missing or malformed and honors fetch-site", () => {
    const request = new Request("https://orbita.example/api", {
      headers: { origin: "https://orbita.example" },
    });
    expect(() => assertSameOrigin(request, "")).toThrow();
    expect(() => assertSameOrigin(request, "not-a-url")).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("https://orbita.example/api", {
          headers: { origin: "https://orbita.example", "sec-fetch-site": "cross-site" },
        }),
        "https://orbita.example",
      ),
    ).toThrow();
  });

  it("rejects an empty body and excessive declared length before parsing", async () => {
    await expect(
      readJsonBody(
        new Request("http://localhost/api", {
          method: "POST",
          headers: { "content-type": "application/json" },
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      readJsonBody(
        new Request("http://localhost/api", {
          method: "POST",
          headers: { "content-type": "application/json", "content-length": "20000" },
          body: "{}",
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
    expect(escapeHtml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;");
  });

  it("counts three working days across a weekend", () => {
    expect(requestDueAt(new Date("2026-11-06T12:00:00Z"))).toBe("2026-11-11T15:00:00.000Z");
  });

  it("limits malformed authentication attempts at the network boundary", async () => {
    db = createClient({ url: "file::memory:" });
    await createSchema(db);
    for (let index = 0; index < 120; index += 1)
      await consumeRateLimit(db, "login-network:blocked", 120, 900_000);
    expect(
      await authenticateCredentials(
        db,
        { login: "student1", password: "OrbitDemo2026!" },
        "blocked",
      ),
    ).toBeNull();
  });

  it("supports the staff workspace with intentionally empty academic sections", async () => {
    db = createClient({ url: "file::memory:" });
    await createSchema(db);
    await seedDatabase(db, new Date(), 4);
    const workspace = await new CampusService(db).getWorkspace("staff-1");
    expect(workspace.requests).toEqual([]);
    expect(workspace.classes).toEqual([]);
    expect(workspace.user.role).toBe("staff");
  });
});
