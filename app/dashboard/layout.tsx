import { requireUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/workspace";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const data = await getWorkspace(user.id);
  return (
    <WorkspaceProvider initial={data}>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
