import { Chats } from "@/components/chats";
import { TeacherConversationView } from "@/components/teacher-conversation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { TeacherService } from "@/lib/teachers";

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string | string[]; compose?: string | string[] }>;
}) {
  const [params, actor] = await Promise.all([searchParams, requireUser()]);
  const thread = Array.isArray(params.thread) ? params.thread[0] : params.thread;
  if (thread) return <TeacherConversationView key={thread} id={thread} />;

  const service = new TeacherService(getDb());
  const [teachers, threads] = await Promise.all([
    service.getTeachers(actor.id),
    actor.role === "staff" ? service.getInbox(actor.id) : service.listThreads(actor.id),
  ]);
  const compose = Array.isArray(params.compose) ? params.compose[0] : params.compose;
  return <Chats teachers={teachers} threads={threads} role={actor.role} compose={compose} />;
}
