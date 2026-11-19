import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { TeacherService } from "@/lib/teachers";

export async function getPageTeacher(id: string) {
  const user = await requireUser();
  const teacher = await new TeacherService(getDb()).findTeacher(user.id, id);
  if (!teacher) notFound();
  return { teacher, role: user.role };
}
