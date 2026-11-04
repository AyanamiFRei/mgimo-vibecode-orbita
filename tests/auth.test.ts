import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { createSchema } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { assertAuthConfiguration, authOptions, getSessionUser, requireUser } from "@/lib/auth";

let db: Client;
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getDb: () => db,
}));
vi.mock("next-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-auth")>()),
  getServerSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

beforeEach(async () => {
  vi.stubEnv("NEXTAUTH_SECRET", "test-only-secret-with-more-than-thirty-two-characters");
  vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
  db = createClient({ url: "file::memory:" });
  await createSchema(db);
  await seedDatabase(db, new Date(), 4);
});
afterEach(() => {
  db.close();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("NextAuth application callbacks", () => {
  it("fails closed for missing secret, short secret and missing canonical URL", () => {
    expect(() => assertAuthConfiguration()).not.toThrow();
    vi.stubEnv("NEXTAUTH_SECRET", "");
    expect(() => assertAuthConfiguration()).toThrow(/NEXTAUTH_SECRET/);
    vi.stubEnv("NEXTAUTH_SECRET", "short");
    expect(() => assertAuthConfiguration()).toThrow(/NEXTAUTH_SECRET/);
    vi.stubEnv("NEXTAUTH_SECRET", "test-only-secret-with-more-than-thirty-two-characters");
    vi.stubEnv("NEXTAUTH_URL", "");
    expect(() => assertAuthConfiguration()).toThrow(/NEXTAUTH_URL/);
  });

  it("reloads the database user behind a valid session and redirects an unauthenticated page", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "student-1", role: "student" },
      expires: "2099-01-01T00:00:00Z",
    });
    expect((await requireUser()).login).toBe("student1");
    await db.execute("UPDATE users SET disabled = 1 WHERE id = 'student-1'");
    expect(await getSessionUser()).toBeNull();
  });

  it("uses database role rather than token role and expires disabled sessions", async () => {
    const sessionCallback = authOptions.callbacks!.session!;
    const input = {
      session: { user: { id: "staff-1", role: "staff" as const }, expires: "2099-01-01T00:00:00Z" },
      token: { sub: "staff-1", role: "staff" as const },
      user: {
        id: "staff-1",
        role: "staff" as const,
        email: "demo@example.test",
        emailVerified: null,
      },
      newSession: undefined,
      trigger: "update" as const,
    };
    expect((await sessionCallback(input)).user).toMatchObject({ id: "staff-1", role: "staff" });
    await db.execute("UPDATE users SET role = 'student' WHERE id = 'staff-1'");
    expect((await sessionCallback(input)).user).toMatchObject({ id: "staff-1", role: "student" });
    await db.execute("UPDATE users SET disabled = 1 WHERE id = 'staff-1'");
    expect((await sessionCallback(input)).user).toMatchObject({ id: "" });
    expect((await sessionCallback(input)).expires).toBe(new Date(0).toISOString());
    expect((await sessionCallback({ ...input, token: {} })).user).toMatchObject({ id: "" });
  });

  it("stores only the actor identifier and role metadata in the token callback", async () => {
    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: { id: "student-1", role: "student", name: "Алиса" },
      account: null,
    });
    expect(token).toEqual({ sub: "student-1", role: "student" });
    expect(JSON.stringify(token)).not.toMatch(/password|hash/);
  });

  it("uses credentials provider with a safe public projection", async () => {
    const provider = authOptions.providers[0];
    if (provider.type !== "credentials") throw new Error("Expected credentials provider");
    const authorize = provider.options?.authorize;
    if (!authorize) throw new Error("Expected configured authorize callback");
    const user = await authorize(
      { login: "student1", password: "OrbitDemo2026!" },
      { headers: {} },
    );
    expect(user).toEqual({
      id: "student-1",
      role: "student",
      name: "Алиса Миронова",
      email: "student1@students.unh.example",
    });
    expect(
      await authorize({ login: "student1", password: "bad-password" }, { headers: {} }),
    ).toBeNull();
    vi.stubEnv("TRUST_PROXY", "true");
    expect(
      await authorize(
        { login: "student2", password: "OrbitDemo2026!" },
        { headers: { "x-forwarded-for": "192.0.2.1, 192.0.2.2" } },
      ),
    ).toMatchObject({ id: "student-2" });
  });
});
