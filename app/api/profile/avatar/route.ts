import { api, apiError, privateHeaders, requireApiUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { deleteAvatar, getAvatar, normalizePhoto, saveAvatar } from "@/lib/profile-avatar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return new Response(await getAvatar(getDb(), user.id), {
      headers: {
        ...privateHeaders,
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  return api(async () => {
    const user = await requireApiUser(request, true, "profile-avatar-write");
    return saveAvatar(getDb(), user.id, await normalizePhoto(request));
  });
}

export async function DELETE(request: Request) {
  return api(async () => {
    const user = await requireApiUser(request, true, "profile-avatar-write");
    return deleteAvatar(getDb(), user.id);
  });
}
