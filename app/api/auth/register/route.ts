import { api } from "@/lib/api";
import { getDb } from "@/lib/db";
import { registerStudent } from "@/lib/registration";
import { assertSameOrigin, readJsonBody } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const forwarded =
      process.env.TRUST_PROXY === "true" ? request.headers.get("x-forwarded-for") : null;
    const network = forwarded ? forwarded.split(",")[0].trim().slice(0, 64) : "shared";
    return registerStudent(getDb(), await readJsonBody(request), network);
  }, 201);
}
