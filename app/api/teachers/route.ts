import { api, requireApiUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { TeacherService } from "@/lib/teachers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return api(async () =>
    new TeacherService(getDb()).getTeachers((await requireApiUser(request)).id),
  );
}
