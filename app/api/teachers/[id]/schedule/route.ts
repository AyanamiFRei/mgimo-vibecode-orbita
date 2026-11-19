import { api, requireApiUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getTeacherSchedule } from "@/lib/teacher-schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const actor = await requireApiUser(request);
    return getTeacherSchedule(
      getDb(),
      actor.id,
      (await params).id,
      Object.fromEntries(new URL(request.url).searchParams),
    );
  });
}
