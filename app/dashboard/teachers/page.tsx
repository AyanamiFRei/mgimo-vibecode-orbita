import { Teachers } from "@/components/teachers";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { TeacherService } from "@/lib/teachers";
import { redirect } from "next/navigation";
export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{
    thread?: string | string[];
    compose?: string | string[];
    teacher?: string | string[];
    q?: string | string[];
  }>;
}) {
  const params = await searchParams;
  if (typeof params.thread === "string" && params.thread)
    redirect(`/dashboard/chats?thread=${encodeURIComponent(params.thread)}`);
  if (typeof params.compose === "string" && params.compose)
    redirect(`/dashboard/chats?compose=${encodeURIComponent(params.compose)}`);
  if (typeof params.teacher === "string" && params.teacher)
    redirect(`/dashboard/teachers/${encodeURIComponent(params.teacher)}`);
  const actor = await requireUser();
  const teachers = await new TeacherService(getDb()).getTeachers(actor.id);
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return <Teachers teachers={teachers} role={actor.role} query={query ?? ""} />;
}
