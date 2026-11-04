import { api, requireApiUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getSchedule } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return api(async () =>
    getSchedule(
      getDb(),
      (await requireApiUser(request)).id,
      Object.fromEntries(new URL(request.url).searchParams),
    ),
  );
}
