import { api, requireApiUser } from "@/lib/api";
import { getCampusService } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return api(async () => getCampusService().getQueue((await requireApiUser(request)).id));
}
