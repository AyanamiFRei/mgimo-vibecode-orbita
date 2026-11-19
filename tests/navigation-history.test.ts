import { describe, expect, it } from "vitest";
import {
  dashboardDestination,
  extendTrail,
  MAX_HISTORY_ENTRIES,
  MAX_TRAIL_LENGTH,
  readStoredVisits,
  visitDashboard,
} from "@/lib/navigation-history";

const home = "/dashboard";
const profile = home + "/profile";
const teachers = home + "/teachers";
const teacher = teachers + "/ca7b2ea5-ecc1-42bb-800a-d25dd68a0401";
const schedule = teacher + "/schedule";
const documents = home + "/documents";
const chats = home + "/chats";

describe("visited dashboard pages", () => {
  it("starts at the actual landing page, including a deep link", () => {
    expect(extendTrail([], profile)).toEqual([profile]);
    expect(extendTrail([], schedule)).toEqual([schedule]);
    expect(dashboardDestination(home)?.title).toBe("Главная");
    expect(dashboardDestination(teacher)?.title).toBe("Профиль преподавателя");
    expect(dashboardDestination(schedule)?.title).toBe("Расписание преподавателя");
  });

  it("keeps the latest filters and dates in links without adding page levels", () => {
    const current = schedule + "?date=2026-11-20&view=day";
    const trail = [teachers + "?q=test", teacher, schedule + "?view=week"];
    expect(extendTrail(trail, current)).toEqual([trail[0], teacher, current]);
    expect(extendTrail(trail, teachers + "?q=updated")).toEqual([teachers + "?q=updated"]);
    expect(extendTrail([documents + "?filter=active"], documents)).toEqual([documents]);
    const longSearch = home + "/search?q=" + "x".repeat(4500);
    expect(extendTrail([profile], longSearch)).toEqual([profile, longSearch]);
  });

  it("records different conversations, drafts and document details as pages", () => {
    const steps = [
      chats,
      chats + "?compose=jane",
      chats + "?thread=one",
      chats + "?thread=two",
      documents,
      documents + "?new=1",
      documents + "?id=one",
      documents + "?id=two",
    ];
    expect(steps.reduce(extendTrail, [] as string[])).toEqual(steps);
    expect(extendTrail(steps, documents + "?new=1&type=study")).toEqual([
      ...steps.slice(0, 5),
      documents + "?new=1&type=study",
    ]);
  });

  it("returns to the original trail in Back and Forward, including a skipped entry", () => {
    const a = visitDashboard([], "a", home);
    const b = visitDashboard(a, "b", teachers);
    const c = visitDashboard(b, "c", teacher);
    const d = visitDashboard(c, "d", schedule);
    const shortcut = visitDashboard(d, "e", teachers);
    expect(shortcut.at(-1)?.trail).toEqual([home, teachers]);
    const back = visitDashboard(shortcut, "b", teachers);
    const forward = visitDashboard(back, "d", schedule);
    expect(forward.at(-1)?.trail).toEqual([home, teachers, teacher, schedule]);
    expect(visitDashboard(forward, "e", teachers).at(-1)?.trail).toEqual([home, teachers]);
  });

  it("resumes across full page loads and keeps accounts isolated", () => {
    const visits = visitDashboard(visitDashboard([], "a", home), "b", profile);
    const json = JSON.stringify({ userId: "student", visits });
    const restored = readStoredVisits(json, "student");
    const search = home + "/search?q=campus";
    expect(visitDashboard(restored, "c", search).at(-1)?.trail).toEqual([home, profile, search]);
    expect(readStoredVisits(json, "staff")).toEqual([]);
  });

  it("keeps the current snapshot on a duplicate visit or a URL outside the cabinet", () => {
    const original = visitDashboard([], "a", profile);
    expect(visitDashboard(original, "a", profile)).toBe(original);
    expect(visitDashboard(original, "a", "/login")).toBe(original);
  });

  it("retains a bounded number of page and browser history entries", () => {
    let visits = visitDashboard([], "a", home);
    for (let i = 0; i < MAX_HISTORY_ENTRIES + MAX_TRAIL_LENGTH; i++) {
      visits = visitDashboard(visits, String(i), chats + "?thread=" + i);
    }
    expect(visits).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(visits.at(-1)?.trail).toHaveLength(MAX_TRAIL_LENGTH);
    expect(visits.at(-1)?.trail).not.toContain(home);
  });

  it("ignores corrupted or unsafe entries when the session is restored", () => {
    const invalid = [
      "https://outside.test/dashboard",
      "//outside.test/dashboard",
      "javascript:alert(1)",
      "/login",
      "/dashboard/../login",
      "/dashboard-malicious",
      "/dashboard/teachers/..%2f..%2flogin",
      "/dashboard\\outside.test",
    ];
    invalid.forEach((href) => {
      expect(dashboardDestination(href)).toBeNull();
      expect(extendTrail([home], href)).toEqual([home]);
    });
    const visits = [
      null,
      { key: "x", trail: "invalid" },
      { key: "y", trail: [home, invalid[0]] },
      { key: "z", trail: [home, profile] },
    ];
    for (const value of [null, "{", "null", "[]", '{"userId":"u","visits":false}']) {
      expect(readStoredVisits(value, "u")).toEqual([]);
    }
    expect(readStoredVisits(JSON.stringify({ userId: "u", visits }), "u")).toEqual([visits[3]]);
  });
});
