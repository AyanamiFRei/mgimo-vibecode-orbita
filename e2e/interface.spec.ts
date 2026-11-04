import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  const name = `ui_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const account = await page.request.post("/api/auth/register", {
    headers: { Origin: "http://localhost:3100" },
    data: {
      login: name,
      password: "OrbitDemo2026!",
      program: "business-informatics",
      persona: "nika",
    },
  });
  expect(account.status()).toBe(201);
  await page.getByLabel("Логин", { exact: true }).fill(name);
  await page.getByLabel("Пароль", { exact: true }).fill("OrbitDemo2026!");
  await page.getByRole("button", { name: "Войти в кабинет", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("auth header contains only brand and requested caption", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator(".login-story > .brand")).toHaveText("орбита");
  await expect(page.locator(".login-story-body")).toHaveText("Больше жизни. Меньше формальностей.");
  await expect(
    page.locator(".login-kicker,.login-university,.login-pills,.login-story p"),
  ).toHaveCount(0);
  await expect(page.locator(".login-orbit")).toBeVisible();
});

test("theme follows system and persists explicit choice across pages and reload", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  const toggle = page.getByRole("button", { name: "Тёмная тема", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Тёмная тема", exact: true }).click();
  await login(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const route of [
    "dashboard",
    "dashboard/schedule?date=2026-11-03",
    "dashboard/grades",
    "dashboard/documents",
    "dashboard/notifications",
    "dashboard/teachers",
  ]) {
    await page.goto(`/${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/screenshots/dark-${route.replaceAll("/", "-").split("?")[0]}-${info.project.name}.png`,
      fullPage: true,
    });
  }
  await page.goto("/dashboard/chats");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  expect(errors).toEqual([]);
});

test("chats tab exposes existing conversations above new chat and auto grows composer", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/dashboard/chats?compose=teacher-1");
  await page.getByLabel("Тема обращения").fill(`Проверка раздела чатов ${info.project.name}`);
  const first = page.getByLabel("Сообщение", { exact: true });
  await first.fill("Уточнение по учебному заданию.");
  await expect(first).toHaveCSS("resize", "none");
  await page.getByRole("button", { name: "Отправить обращение", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/chats\?thread=/);
  const threadId = new URL(page.url()).searchParams.get("thread");
  const reply = page.getByLabel("Ответ в диалоге");
  const originalHeight = await reply.evaluate((element) => element.getBoundingClientRect().height);
  await reply.fill(
    Array.from({ length: 8 }, (_, i) => `Строка ${i + 1}: уточнение задания`).join("\n"),
  );
  await expect(reply).toHaveCSS("resize", "none");
  await expect
    .poll(() => reply.evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThan(originalHeight);
  await page.getByRole("button", { name: "Отправить ответ", exact: true }).click();
  await expect(reply).toHaveValue("");
  await expect
    .poll(() => reply.evaluate((element) => element.getBoundingClientRect().height))
    .toBeLessThanOrEqual(originalHeight + 2);
  await page.getByRole("link", { name: "Все чаты", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Чаты", exact: true })).toBeVisible();
  await expect(page.locator(".existing-chats")).toContainText(
    `Проверка раздела чатов ${info.project.name}`,
  );
  const existing = await page.locator(".existing-chats").boundingBox();
  const create = await page.locator("#new-chat").boundingBox();
  expect(existing!.y).toBeLessThan(create!.y);
  await expect(
    page
      .getByRole("navigation", { name: "Основная навигация" })
      .getByRole("link", { name: "Чаты", exact: true }),
  ).toHaveAttribute("href", "/dashboard/chats");
  await page.goto(`/dashboard/teachers?thread=${threadId}`);
  await expect(page).toHaveURL(`/dashboard/chats?thread=${threadId}`);
  await page.getByRole("button", { name: "Тёмная тема", exact: true }).click();
  await page.screenshot({
    path: `docs/screenshots/chats-dark-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/dashboard/chats");
  await expect(page.locator(".existing-chats")).toContainText(
    `Проверка раздела чатов ${info.project.name}`,
  );
  await page.screenshot({
    path: `docs/screenshots/chats-index-dark-${info.project.name}.png`,
    fullPage: true,
  });
});
