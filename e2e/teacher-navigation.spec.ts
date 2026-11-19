import { expect, test, type Page } from "@playwright/test";

async function loginFresh(page: Page) {
  await page.goto("/login");
  const login = `nav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const result = await page.request.post("/api/auth/register", {
    headers: { Origin: "http://localhost:3100" },
    data: {
      login,
      password: "OrbitDemo2026!",
      persona: "nika",
      program: "business-informatics",
    },
  });
  expect(result.status()).toBe(201);
  await page.getByLabel("Логин", { exact: true }).fill(login);
  await page.getByLabel("Пароль", { exact: true }).fill("OrbitDemo2026!");
  await page.getByRole("button", { name: "Войти в кабинет", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("teacher profile and calendar keep a usable navigation trail and filters", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await loginFresh(page);
  await page.goto("/dashboard/teachers?q=Вера");
  const main = page.locator("main#main");
  const startMotion = await main.evaluate((element) => getComputedStyle(element).animationName);
  const releaseProfile = Promise.withResolvers<void>();
  await page.route("**/dashboard/teachers/teacher-1?*", async (route) => {
    await releaseProfile.promise;
    await route.continue();
  });
  try {
    await page
      .locator(".teacher-card")
      .getByRole("link", { name: /Вера Лунова/ })
      .click({ noWaitAfter: true });
    await expect(
      page.locator(".nav-pending").or(page.locator(".dashboard-loading")).first(),
    ).toBeAttached();
  } finally {
    releaseProfile.resolve();
  }
  await expect(page).toHaveURL(/\/dashboard\/teachers\/teacher-1$/);
  await expect(page.getByRole("heading", { name: "Вера Лунова", exact: true })).toBeVisible();
  await expect(main).not.toHaveCSS("animation-name", startMotion);
  await expect(page.locator(".teacher-profile-details")).toContainText("Консультации");
  await page.screenshot({
    path: `output/qa/teacher-profile-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Расписание преподавателя", exact: true }).click();
  await expect(page).toHaveURL(/\/teachers\/teacher-1\/schedule$/);
  await expect(page.locator(".lesson").first()).toBeVisible();
  const scheduleMotion = await main.evaluate((element) => getComputedStyle(element).animationName);
  await page.getByLabel("Перейти к дате").fill("2027-04-12");
  await expect(page.getByLabel("Семестр")).toHaveValue("spring-2027");
  await expect(page.locator(".schedule-view")).toContainText("БИ-23-01");
  await expect(page.locator(".schedule-view")).toContainText("МО-24-02");
  await expect(main).toHaveCSS("animation-name", scheduleMotion);
  const scheduleUrl = page.url();
  await page.screenshot({
    path: `output/qa/teacher-schedule-${info.project.name}.png`,
    fullPage: true,
  });
  const trail = page.getByRole("navigation", { name: "Хлебные крошки" });
  await trail.getByRole("link", { name: "Профиль преподавателя", exact: true }).click();
  await expect(page).toHaveURL(/\/teachers\/teacher-1$/);
  await page.goBack();
  await expect(page).toHaveURL(scheduleUrl);
  await expect(trail.locator('[aria-current="page"]')).toHaveText("Расписание преподавателя");
  await page.goForward();
  await expect(page).toHaveURL(/\/teachers\/teacher-1$/);
  await trail.getByRole("link", { name: "Преподаватели", exact: true }).click();
  await expect(page.getByLabel("Найти преподавателя")).toHaveValue("Вера");
  expect(new URL(page.url()).searchParams.get("q")).toBe("Вера");
  await page.reload();
  await expect(trail.locator('[aria-current="page"]')).toHaveText("Преподаватели");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("warm light surfaces and Material motion respect reduced motion", async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await loginFresh(page);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(220, 201, 169)");
  await expect(page.locator(".panel").first()).toHaveCSS("background-color", "rgb(248, 241, 228)");
  await expect(page.locator("main#main")).toHaveCSS("animation-name", /orbita-route-spatial/);
  await page.screenshot({
    path: `output/qa/warm-dashboard-${info.project.name}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("main#main")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".sidebar")).toHaveCSS("transition-duration", "0s");
  await page.getByRole("button", { name: "Тёмная тема", exact: true }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 27, 25)");
  await page.goto("/dashboard/teachers/teacher-1");
  await expect(page.getByRole("heading", { name: "Вера Лунова", exact: true })).toBeVisible();
  await page.screenshot({
    path: `output/qa/teacher-dark-${info.project.name}.png`,
    fullPage: true,
  });
});
