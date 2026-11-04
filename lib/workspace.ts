import { getDb } from "@/lib/db";
import { CampusService } from "@/lib/service";
import type { Workspace } from "@/lib/types";

export function getCampusService(): CampusService {
  return new CampusService(getDb());
}
export async function getWorkspace(userId: string): Promise<Workspace> {
  return getCampusService().getWorkspace(userId);
}
