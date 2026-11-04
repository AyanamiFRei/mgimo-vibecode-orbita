import { api, requireApiUser } from "@/lib/api";
import { readJsonBody } from "@/lib/security";
import { getCampusService } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return api(async () => {
    const user = await requireApiUser(request, true, "read-notifications");
    return getCampusService().markNotificationsRead(user.id, await readJsonBody(request));
  });
}
