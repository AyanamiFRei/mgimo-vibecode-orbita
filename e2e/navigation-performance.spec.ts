import { expect, test } from "@playwright/test";

test("directory and chat list arrive with their routes; the calendar does not reload routes", async ({
  page,
  isMobile,
}) => {
  await page.goto("/login");
  await page.getByLabel("Логин", { exact: true }).fill("student1");
  await page.getByLabel("Пароль", { exact: true }).fill("OrbitDemo2026!");
  await page.getByRole("button", { name: "Войти в кабинет", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const requests: { url: URL; document: boolean }[] = [];
  page.on("request", (request) => {
    requests.push({ url: new URL(request.url()), document: request.resourceType() === "document" });
  });
  const nav = page.getByRole("navigation", { name: "Основная навигация" });
  if (isMobile) await page.getByRole("button", { name: "Открыть меню" }).click();
  await nav.getByRole("link", { name: "Преподаватели", exact: true }).click();
  await expect(page.locator(".teacher-card").first()).toBeVisible();
  await page.getByLabel("Найти преподавателя").fill("Вера");
  await page.getByRole("button", { name: "Найти", exact: true }).click();
  await expect(page).toHaveURL(/\?q=/);
  await page.getByRole("link", { name: "Открыть чаты" }).click();
  await expect(page.locator(".chat-teacher-picker")).toBeVisible();
  expect(
    requests
      .filter(({ url }) => /^\/api\/(teachers|teacher-threads)$/.test(url.pathname))
      .map(({ url }) => url.pathname),
  ).toEqual([]);
  expect(requests.filter(({ document }) => document)).toHaveLength(0);

  await page.goto("/dashboard/schedule?date=2026-11-03&view=day");
  await expect(page.locator(".schedule-view")).toBeVisible();
  requests.length = 0;
  await page.getByRole("link", { name: "Неделя", exact: true }).click();
  await expect(page.locator(".weekly-view")).toBeVisible();
  expect(requests.filter(({ url }) => url.pathname === "/api/schedule")).toHaveLength(0);
  await page.getByRole("link", { name: "Следующая неделя" }).click();
  await expect(page.locator(".schedule-view")).toContainText("9 ноября");
  expect(requests.filter(({ url }) => url.pathname === "/api/schedule")).toHaveLength(1);
  expect(
    requests.filter(
      ({ url }) => url.pathname === "/dashboard/schedule" && url.searchParams.has("date"),
    ),
  ).toHaveLength(0);
  await page.goBack();
  await expect(page.locator(".weekly-view")).toContainText("2 ноября");
});
