import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { authenticateCredentials } from "@/lib/credentials";
import { getDb } from "@/lib/db";
import { findUser } from "@/lib/users";
import type { User } from "@/lib/types";

export function assertAuthConfiguration(): void {
  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    throw new Error("NEXTAUTH_SECRET must contain at least 32 characters.");
  }
  if (!process.env.NEXTAUTH_URL) throw new Error("NEXTAUTH_URL must be configured.");
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Орбита",
      credentials: {
        login: { label: "Логин", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials, request) {
        assertAuthConfiguration();
        // Trust forwarded addresses only behind an explicitly configured, sanitizing reverse proxy.
        const forwarded =
          process.env.TRUST_PROXY === "true" ? request.headers?.["x-forwarded-for"] : undefined;
        const network =
          typeof forwarded === "string" ? forwarded.split(",")[0].trim().slice(0, 64) : "shared";
        const user = await authenticateCredentials(getDb(), credentials, network);
        return user ? { id: user.id, role: user.role, name: user.name, email: user.email } : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      const user = token.sub ? await findUser(getDb(), token.sub) : null;
      session.user = user
        ? { id: user.id, role: user.role, name: user.name, email: user.email }
        : { id: "", role: "student", name: null, email: null };
      if (!user) session.expires = new Date(0).toISOString();
      return session;
    },
  },
  logger: {
    error(code) {
      console.error("orbita.auth.error", code);
    },
    warn(code) {
      console.warn("orbita.auth.warning", code);
    },
    debug() {},
  },
};

export async function getSessionUser(): Promise<User | null> {
  assertAuthConfiguration();
  const session = await getServerSession(authOptions);
  return session?.user.id ? findUser(getDb(), session.user.id) : null;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
