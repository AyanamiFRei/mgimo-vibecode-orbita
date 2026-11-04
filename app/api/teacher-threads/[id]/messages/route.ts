import { api, requireApiUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { readJsonBody } from "@/lib/security";
import { TeacherService } from "@/lib/teachers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return api(async () =>
    new TeacherService(getDb()).getConversation(
      (await requireApiUser(request)).id,
      (await context.params).id,
    ),
  );
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    const actor = await requireApiUser(request, true, "teacher-message");
    return new TeacherService(getDb()).sendMessage(
      actor.id,
      (await context.params).id,
      await readJsonBody(request),
    );
  }, 201);
}
