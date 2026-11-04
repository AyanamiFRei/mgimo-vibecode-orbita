import { Teachers } from "@/components/teachers";
import { redirect } from "next/navigation";
export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string | string[]; compose?: string | string[] }>;
}) {
  const params = await searchParams;
  if (typeof params.thread === "string" && params.thread)
    redirect(`/dashboard/chats?thread=${encodeURIComponent(params.thread)}`);
  if (typeof params.compose === "string" && params.compose)
    redirect(`/dashboard/chats?compose=${encodeURIComponent(params.compose)}`);
  return <Teachers />;
}
