import { api, requireApiUser } from "@/lib/api";
import { getWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return api(async () => getWorkspace((await requireApiUser(request)).id));
}
