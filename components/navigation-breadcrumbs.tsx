"use client";

import { ChevronRight, Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  dashboardDestination,
  extendTrail,
  readStoredVisits,
  visitDashboard,
  type NavigationVisit,
} from "@/lib/navigation-history";

const storageKey = "orbita.dashboard-navigation.v1";
const emptyTrail: string[] = [];
const subscribers = new Set<() => void>();
let activeSession: { userId: string; visits: NavigationVisit[] } | null = null;

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

function browserEntryKey(): string {
  const browserKey = window.navigation?.currentEntry?.key;
  if (browserKey) return browserKey;
  // Older browsers can keep our entry identifier alongside the router's history state.
  const history = window.history;
  const previous = history.state?.orbitaBreadcrumbEntry;
  if (typeof previous === "string") return previous;
  const key = window.crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  try {
    history.replaceState({ ...history.state, orbitaBreadcrumbEntry: key }, "");
  } catch {
    // The active trail still works when a browser restricts history state updates.
  }
  return key;
}

function recordVisit(userId: string, href: string, restoreSession = false) {
  const session = activeSession?.userId === userId ? activeSession : null;
  let visits = session?.visits ?? [];
  if (!session || restoreSession) {
    try {
      visits = readStoredVisits(window.sessionStorage.getItem(storageKey), userId);
    } catch {
      // Keep the in-memory history when tab storage is unavailable.
    }
  }
  const updated = visitDashboard(visits, browserEntryKey(), href);
  if (session?.visits === updated) return;
  activeSession = { userId, visits: updated };
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(activeSession));
  } catch {
    // Storage quotas or privacy settings do not prevent navigation within this document.
  }
  subscribers.forEach((notify) => notify());
}

export function clearNavigationHistory() {
  activeSession = null;
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // A browser can disable tab storage.
  }
  subscribers.forEach((notify) => notify());
}

const serverTrail = () => emptyTrail;

export function NavigationBreadcrumbs({ userId }: { userId: string }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const href = query ? pathname + "?" + query : pathname;
  const previous = useSyncExternalStore(
    subscribe,
    () =>
      (activeSession?.userId === userId ? activeSession.visits.at(-1)?.trail : null) ?? emptyTrail,
    serverTrail,
  );
  useEffect(() => {
    recordVisit(userId, href);
    const restore = (event: PageTransitionEvent | PopStateEvent) => {
      const query = new URLSearchParams(window.location.search).toString();
      const current = window.location.pathname + (query ? "?" + query : "");
      recordVisit(userId, current, "persisted" in event && event.persisted);
    };
    window.addEventListener("popstate", restore);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("pageshow", restore);
    };
  }, [href, userId]);

  const trail = extendTrail(previous, href);
  const hiddenCount = trail.length > 3 ? trail.length - 2 : 0;
  return (
    <nav className="navigation-breadcrumbs" aria-label="Хлебные крошки">
      <ol>
        {hiddenCount > 0 && (
          <li className="breadcrumb-overflow">
            <details
              key={href}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  event.currentTarget.open = false;
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && event.currentTarget.open) {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary aria-label="Предыдущие страницы">
                <Ellipsis size={18} aria-hidden="true" />
              </summary>
              <ol className="breadcrumb-menu">
                {trail.slice(0, hiddenCount).map((item) => (
                  <li key={item}>
                    <Link href={item}>{dashboardDestination(item)?.title}</Link>
                  </li>
                ))}
              </ol>
            </details>
          </li>
        )}
        {trail.slice(hiddenCount).map((item, i) => (
          <li key={item}>
            {(i > 0 || hiddenCount > 0) && (
              <ChevronRight className="breadcrumb-separator" size={13} aria-hidden="true" />
            )}
            {item === trail.at(-1) ? (
              <span aria-current="page">{dashboardDestination(item)?.title}</span>
            ) : (
              <Link href={item}>{dashboardDestination(item)?.title}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
