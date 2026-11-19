"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type QueryHref = `?${string}`;

export function setLocalQuery(href: QueryHref) {
  if (href !== window.location.search) window.history.pushState(null, "", href);
}

// These controls change client-side view state. The href still supports sharing and new tabs.
export function QueryLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href" | "onNavigate" | "prefetch"> & { href: QueryHref }) {
  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onNavigate={(event) => {
        event.preventDefault();
        setLocalQuery(href);
      }}
    />
  );
}
