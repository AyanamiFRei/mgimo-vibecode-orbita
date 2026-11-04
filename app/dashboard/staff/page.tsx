import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Staff } from "@/components/staff";
export default async function Page() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/dashboard");
  return <Staff />;
}
