export const MAX_TRAIL_LENGTH = 12;
export const MAX_HISTORY_ENTRIES = 32;

export interface NavigationVisit {
  key: string;
  trail: string[];
}

export const dashboardTitles: Record<string, string> = {
  "/dashboard": "Главная",
  "/dashboard/schedule": "Расписание",
  "/dashboard/grades": "Успеваемость",
  "/dashboard/teachers": "Преподаватели",
  "/dashboard/chats": "Чаты",
  "/dashboard/documents": "Документы",
  "/dashboard/notifications": "Уведомления",
  "/dashboard/profile": "Профиль",
  "/dashboard/search": "Поиск",
  "/dashboard/staff": "Очередь деканата",
};

const detailPages: Record<string, [string, string][]> = {
  "/dashboard/chats": [
    ["thread", "Переписка"],
    ["compose", "Новое сообщение"],
  ],
  "/dashboard/documents": [
    ["id", "Заявка"],
    ["new", "Новая заявка"],
  ],
};

export function dashboardDestination(href: unknown): { identity: string; title: string } | null {
  if (typeof href !== "string" || /[\s\\#]/u.test(href)) return null;
  const separator = href.indexOf("?");
  const path = separator < 0 ? href : href.slice(0, separator);
  const teacher = /^\/dashboard\/teachers\/[a-zA-Z\d_-]+(\/schedule)?$/.exec(path);
  if (teacher) {
    return {
      identity: path,
      title: teacher[1] ? "Расписание преподавателя" : "Профиль преподавателя",
    };
  }
  if (!Object.hasOwn(dashboardTitles, path)) return null;
  if (separator >= 0 && detailPages[path]) {
    const params = new URLSearchParams(href.slice(separator + 1));
    for (const [param, title] of detailPages[path]) {
      const value = params.get(param);
      if (value === null || (path === "/dashboard/chats" && !value)) continue;
      const identity =
        path + "?" + param + (param === "new" ? "" : "=" + encodeURIComponent(value));
      return { identity, title };
    }
  }
  return { identity: path, title: dashboardTitles[path] };
}

export function extendTrail(trail: string[], href: string): string[] {
  const page = dashboardDestination(href);
  if (!page || trail.at(-1) === href) return trail;
  const previous = trail.findIndex(
    (item) => dashboardDestination(item)?.identity === page.identity,
  );
  const ancestors = previous < 0 ? trail : trail.slice(0, previous);
  return [...ancestors.slice(1 - MAX_TRAIL_LENGTH), href];
}

export function visitDashboard(
  visits: NavigationVisit[],
  key: string,
  href: string,
): NavigationVisit[] {
  if (!dashboardDestination(href)) return visits;
  const last = visits.at(-1);
  if (last?.key === key && last.trail.at(-1) === href) return visits;
  const saved = visits.find((entry) => entry.key === key);
  const trail =
    saved && saved.trail.at(-1) === href ? saved.trail : extendTrail(last?.trail ?? [], href);
  return [
    ...visits.filter((entry) => entry.key !== key).slice(1 - MAX_HISTORY_ENTRIES),
    { key, trail },
  ];
}

export function readStoredVisits(value: string | null, userId: string): NavigationVisit[] {
  if (!value) return [];
  try {
    const record = JSON.parse(value);
    if (record?.userId !== userId || !Array.isArray(record.visits)) return [];
    return record.visits
      .slice(-MAX_HISTORY_ENTRIES)
      .filter(
        (entry: NavigationVisit | null) =>
          typeof entry?.key === "string" &&
          Array.isArray(entry.trail) &&
          entry.trail.length > 0 &&
          entry.trail.length <= MAX_TRAIL_LENGTH &&
          entry.trail.every((href) => dashboardDestination(href) !== null),
      );
  } catch {
    return [];
  }
}
