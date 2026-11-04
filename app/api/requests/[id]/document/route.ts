import { apiError, privateHeaders, requireApiUser } from "@/lib/api";
import { renderDocument } from "@/lib/document";
import { getCampusService } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const data = await getCampusService().getDocument(user.id, (await context.params).id);
    return new Response(renderDocument(data), {
      headers: {
        ...privateHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
