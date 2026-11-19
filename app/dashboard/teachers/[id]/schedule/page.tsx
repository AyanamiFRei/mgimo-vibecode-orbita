import { Schedule } from "@/components/schedule";
import { getPageTeacher } from "../teacher";

export default async function TeacherSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await getPageTeacher((await params).id);
  return <Schedule teacher={teacher} />;
}
