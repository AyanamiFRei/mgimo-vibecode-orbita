"use client";

import Image from "next/image";
import { useState } from "react";
import type { User } from "@/lib/types";

export function UserAvatar({ user, large = false }: { user: User; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("");
  return (
    <span className={large ? "avatar avatar-large" : "avatar"} aria-hidden="true">
      {user.avatarUrl && user.avatarUrl !== failedUrl ? (
        <Image
          src={user.avatarUrl}
          alt=""
          width={256}
          height={256}
          unoptimized
          style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }}
          onError={() => setFailedUrl(user.avatarUrl ?? null)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
