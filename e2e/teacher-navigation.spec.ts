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
  isMobile,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await loginFresh(page);
  await page.goto("/dashboard/teachers?q=Вера");
  const main = page.locator("main#main");
  await expect(main).toHaveCSS("animation-name", "none");
  if (!isMobile) {
    const card = page.locator(".teacher-card").first();
    await card.hover();
    await expect(card).toHaveCSS("transform", "none");
  }
  await main.evaluate((element) => {
    element.addEventListener("animationstart", (event) => {
      if (event.target === element && event instanceof AnimationEvent) {
        element.setAttribute("data-observed-animation", event.animationName);
        element.setAttribute("data-observed-transform", getComputedStyle(element).transform);
      }
    });
  });
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
  await expect(main).toHaveAttribute("data-observed-animation", /orbita-route-effects/);
  await expect(main).toHaveAttribute("data-observed-transform", "none");
  await expect(page.locator(".teacher-profile-details")).toContainText("Консультации");
  await page.screenshot({
    path: `output/qa/teacher-profile-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Расписание преподавателя", exact: true }).click();
  await expect(page).toHaveURL(/\/teachers\/teacher-1\/schedule$/);
  await expect(page.locator(".lesson").first()).toBeVisible();
  await expect(main).toHaveCSS("animation-name", "none");
  await main.evaluate((element) => element.removeAttribute("data-observed-animation"));
  await page.getByLabel("Перейти к дате").fill("2027-04-12");
  await expect(page.getByLabel("Семестр")).toHaveValue("spring-2027");
  await expect(page.locator(".schedule-view")).toContainText("БИ-23-01");
  await expect(page.locator(".schedule-view")).toContainText("МО-24-02");
  await expect(main).not.toHaveAttribute("data-observed-animation");
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
  const releaseCancelledProfile = Promise.withResolvers<void>();
  await page.route("**/dashboard/teachers/teacher-1?*", async (route) => {
    await releaseCancelledProfile.promise;
    await route.continue().catch(() => undefined);
  });
  try {
    await page.getByRole("link", { name: /Вера Лунова/ }).click({ noWaitAfter: true });
    await expect(page.locator(".nav-pending")).toBeAttached();
    await page.getByRole("link", { name: "Открыть чаты" }).click();
    await expect(page.getByRole("heading", { name: "Чаты", exact: true })).toBeVisible();
  } finally {
    releaseCancelledProfile.resolve();
  }
  await expect(page).toHaveURL(/\/dashboard\/chats$/);
  await expect(main).toHaveCSS("animation-name", "none");
  await expect(main).toHaveCSS("opacity", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("original light surfaces and Material motion respect reduced motion", async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await loginFresh(page);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(246, 247, 243)");
  await expect(page.locator(".panel").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("main#main")).toHaveCSS("animation-name", "none");
  await page.screenshot({
    path: `output/qa/light-dashboard-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/dashboard/documents");
  await page
    .getByRole("link", { name: "Справка о стипендии Оформить онлайн", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Создание заявки" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("animation-name", /orbita-dialog-spatial/);
  await expect(page.locator("main#main")).toHaveCSS("animation-name", "none");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("main#main")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".sidebar")).toHaveCSS("transition-duration", "0s");
  await page.getByRole("button", { name: "Тёмная тема", exact: true }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 27, 25)");
  await page.goto("/dashboard/teachers/teacher-1");
  await expect(page.getByRole("heading", { name: "Вера Лунова", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Расписание преподавателя", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Расписание преподавателя", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main#main")).toHaveCSS("animation-name", "none");
  await page.screenshot({
    path: `output/qa/teacher-dark-${info.project.name}.png`,
    fullPage: true,
  });
});
