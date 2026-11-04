import { z } from "zod";
import { api, requireApiUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { readJsonBody } from "@/lib/security";
import { TeacherService } from "@/lib/teachers";
import { validate } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const actor = await requireApiUser(request, true, "teacher-read");
    validate(z.object({}).strict(), await readJsonBody(request));
    return new TeacherService(getDb()).markRead(actor.id, (await context.params).id);
  });
}
