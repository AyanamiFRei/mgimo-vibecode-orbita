import { api, requireApiUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { readJsonBody } from "@/lib/security";
import { TeacherService } from "@/lib/teachers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return api(async () =>
    new TeacherService(getDb()).listThreads((await requireApiUser(request)).id),
  );
}
export async function POST(request: Request) {
  return api(async () => {
    const actor = await requireApiUser(request, true, "teacher-thread");
    return new TeacherService(getDb()).createThread(actor.id, await readJsonBody(request));
  }, 201);
}
