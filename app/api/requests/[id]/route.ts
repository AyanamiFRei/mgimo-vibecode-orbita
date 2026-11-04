import { api, requireApiUser } from "@/lib/api";
import { readJsonBody } from "@/lib/security";
import { getCampusService } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return api(async () => {
    const user = await requireApiUser(request);
    return getCampusService().getRequest(user.id, (await context.params).id);
  });
}

export async function PATCH(request: Request, context: Context) {
  return api(async () => {
    const user = await requireApiUser(request, true, "update-request");
    return getCampusService().updateRequest(
      user.id,
      (await context.params).id,
      await readJsonBody(request),
    );
  });
}
