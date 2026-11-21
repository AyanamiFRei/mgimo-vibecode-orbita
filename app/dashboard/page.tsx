import { connection } from "next/server";
import { Dashboard } from "@/components/dashboard";
export default async function Page() {
  await connection();
  return <Dashboard initialTime={new Date().getTime()} />;
}
