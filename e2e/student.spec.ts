import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, username = "student1") {
  await page.goto("/login");
  await page.getByLabel("Логин", { exact: true }).fill(username);
  await page.getByLabel("Пароль", { exact: true }).fill("OrbitDemo2026!");
  await page.getByRole("button", { name: "Войти в кабинет", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function navigate(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Открыть меню", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name, exact: true })
    .click();
}

test("student completes all core journeys and data survives reload", async ({ page }, testInfo) => {
  await page.goto("/login");
  await page.screenshot({ path: `docs/screenshots/login-${testInfo.project.name}.png`, fullPage: true });
  await login(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.screenshot({ path: `docs/screenshots/dashboard-${testInfo.project.name}-viewport.png` });
  await navigate(page, "Расписание");
  await expect(page.getByRole("heading", { name: "Расписание", exact: true })).toBeVisible();
  await page.screenshot({ path: `docs/screenshots/schedule-${testInfo.project.name}.png` });
  await page.getByRole("link", { name: "Неделя", exact: true }).click();
  await expect(page.locator(".lesson").first()).toBeVisible();
  await page.getByRole("link", { name: "Следующая неделя" }).click();
  await expect(page.locator(".lesson").first()).toBeVisible();
  await navigate(page, "Успеваемость");
  await expect(page.getByText("Средний балл", { exact: true })).toBeVisible();
  await page.screenshot({ path: `docs/screenshots/grades-${testInfo.project.name}.png` });
  await expect(page.locator(".grade-stat").first().locator("strong")).not.toHaveText("— / 5");
  await navigate(page, "Документы");
  await page.getByRole("button", { name: "Новая заявка", exact: true }).click();
  await page.getByLabel("Куда нужна справка").fill("Для проверки жюри");
  await page.screenshot({ path: `docs/screenshots/request-form-${testInfo.project.name}.png` });
  await page.getByRole("button", { name: "Отправить заявку", exact: true }).click();
  await expect(page.getByText("Заявка отправлена")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Для проверки жюри").first()).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/documents-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await navigate(page, "Уведомления");
  await expect(page.getByRole("heading", { name: "Уведомления", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("student isolation and full staff document lifecycle", async ({ browser }, testInfo) => {
  const purpose = `Для полного сценария жюри (${testInfo.project.name})`;
  const options = { viewport: testInfo.project.use.viewport };
  const one = await browser.newContext(options);
  const two = await browser.newContext(options);
  const staff = await browser.newContext(options);
  const alice = await one.newPage();
  const mark = await two.newPage();
  const dean = await staff.newPage();
  await login(alice);
  await login(mark, "student2");
  await login(dean, "dean");
  const a = await (await alice.request.get("/api/workspace")).json();
  const b = await (await mark.request.get("/api/workspace")).json();
  expect(a.data.user.name).not.toBe(b.data.user.name);
  expect(a.data.user.group).not.toBe(b.data.user.group);
  const created = await alice.request.post("/api/requests", {
    headers: { Origin: "http://localhost:3100" },
    data: { type: "study", purpose, comment: "Тестовая заявка" },
  });
  expect(created.status()).toBe(201);
  const { data: request } = await created.json();
  expect((await mark.request.get(`/api/requests/${request.id}`)).status()).toBe(404);
  expect((await mark.request.get(`/api/requests/${request.id}/document`)).status()).toBe(404);
  expect((await alice.request.get("/api/staff/requests")).status()).toBe(403);
  expect(
    (
      await alice.request.patch(`/api/requests/${request.id}`, {
        headers: { Origin: "http://localhost:3100" },
        data: { status: "processing" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await alice.request.post("/api/requests", {
        headers: { Origin: "https://evil.example" },
        data: { type: "study", purpose: "Чужой origin" },
      })
    ).status(),
  ).toBe(403);
  await dean.goto("/dashboard/staff");
  const card = dean.locator(".staff-request").filter({ hasText: purpose });
  await card.getByLabel("Ответ студенту").fill("Заявка принята в работу");
  await card.getByRole("button", { name: "Обновить статус" }).click();
  await expect(dean.getByRole("status")).toContainText("Статус обновлён");
  await expect(card.getByLabel("Новый статус")).toHaveValue("ready");
  await card.getByLabel("Ответ студенту").fill("Документ готов, можно открыть образец");
  await card.getByRole("button", { name: "Обновить статус" }).click();
  await expect(card.locator(".badge")).toHaveText("Готова");
  await dean.screenshot({
    path: `docs/screenshots/staff-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await alice.goto(`/dashboard/documents?id=${request.id}`);
  await expect(alice.getByText("Готова", { exact: true }).first()).toBeVisible();
  const document = await alice.request.get(`/api/requests/${request.id}/document`);
  expect(document.status()).toBe(200);
  expect(await document.text()).toContain("ОБРАЗЕЦ");
  await alice.goto("/dashboard/notifications");
  await expect(
    alice.getByText("Документ готов, можно открыть образец", { exact: false }).first(),
  ).toBeVisible();
  await alice.getByRole("button", { name: "Прочитать все" }).click();
  await alice.reload();
  await expect(alice.getByRole("button", { name: "Прочитать все" })).toBeDisabled();
  await one.close();
  await two.close();
  await staff.close();
});

test("selected document type and mobile keyboard menu", async ({ page }, testInfo) => {
  await login(page, "student2");
  await page.goto("/dashboard/documents");
  await page
    .getByRole("link", { name: "Справка о стипендии Оформить онлайн", exact: true })
    .click();
  await expect(page.getByLabel("Что тебе нужно?")).toHaveValue("scholarship");
  await page.getByLabel("Куда нужна справка").fill("Сохранённый черновик для проверки");
  await page.goBack();
  await page.getByRole("link", { name: "Справка о стипендии Оформить онлайн", exact: true }).click();
  await expect(page.getByLabel("Куда нужна справка")).toHaveValue("Сохранённый черновик для проверки");
  await page.getByRole("button", { name: "Закрыть форму" }).click();
  if (testInfo.project.name === "mobile") {
    const trigger = page.getByRole("button", { name: "Открыть меню" });
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Навигация кабинета" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(page.locator("aside")).toHaveAttribute("inert", "");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("incorrect password stays on sign in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Логин", { exact: true }).fill("student1");
  await page.getByLabel("Пароль", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Войти в кабинет", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("protected pages require sign in", async ({ page }) => {
  await page.goto("/dashboard/documents");
  await expect(page).toHaveURL(/\/login/);
});
