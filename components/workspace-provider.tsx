"use client";
import { createContext, useCallback, useContext, useState } from "react";
import type { StudentRequest, Workspace } from "@/lib/types";

const Context = createContext<{
  data: Workspace;
  refresh: () => Promise<void>;
  addRequest: (request: StudentRequest) => void;
} | null>(null);
export function WorkspaceProvider({
  initial,
  children,
}: {
  initial: Workspace;
  children: React.ReactNode;
}) {
  const [data, setData] = useState(initial);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось обновить кабинет. Попробуйте ещё раз.");
    const body = await response.json();
    setData(body.data);
  }, []);
  const addRequest = useCallback(
    (request: StudentRequest) =>
      setData((current) => ({
        ...current,
        requests: [request, ...current.requests.filter((item) => item.id !== request.id)],
      })),
    [],
  );
  return <Context.Provider value={{ data, refresh, addRequest }}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkspaceProvider required");
  return value;
}
export async function apiMutation<T>(path: string, body: unknown, method = "POST"): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error?.message || "Не удалось сохранить. Попробуйте ещё раз.");
  return result.data;
}
