import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, name: string) {
  await page.goto("/login");
  await page.getByLabel("Логин", { exact: true }).fill(name);
  await page.getByLabel("Пароль", { exact: true }).fill("OrbitDemo2026!");
  await page.getByRole("button", { name: "Войти в кабинет", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("login headline fits iPhone SE and enlarged text", async ({ page }) => {
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 667 });
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const bounds = await page.locator(".login-story").evaluate((section) => {
      const area = section.getBoundingClientRect();
      const title = section.querySelector("h1")!;
      const fragments = Array.from(title.querySelectorAll("span, em")).map((element) =>
        element.getBoundingClientRect(),
      );
      return {
        right: area.right,
        left: area.left,
        fragments: fragments.map((r) => ({ left: r.left, right: r.right })),
        fits: title.scrollWidth <= title.clientWidth,
      };
    });
    expect(bounds.fits).toBe(true);
    for (const fragment of bounds.fragments) {
      expect(fragment.right).toBeLessThanOrEqual(bounds.right);
      expect(fragment.left).toBeGreaterThanOrEqual(bounds.left);
    }
    await page.screenshot({ path: `docs/screenshots/login-se-${width}.png`, fullPage: true });
    await page.locator(".login-story h1").evaluate((element) => {
      element.style.fontSize = `${parseFloat(getComputedStyle(element).fontSize) * 1.5}px`;
    });
    expect(
      await page
        .locator(".login-story h1")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
  }
});

test("fictional registration provisions own profile and curriculum", async ({ page }, info) => {
  await page.goto("/register");
  const loginName = `jury_${info.project.name}_${Date.now()}`;
  await page.getByLabel("Логин", { exact: true }).fill(loginName);
  await page.getByLabel("Пароль", { exact: true }).fill("NewOrbitDemo2026!");
  await page.getByLabel("Повтори пароль").fill("NewOrbitDemo2026!");
  await page.getByLabel("Учебное направление").selectOption("business-informatics");
  await page.getByLabel("Вымышленный персонаж").selectOption("nika");
  await page.getByLabel("Использую только вымышленные данные").check();
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  const workspace = await (await page.request.get("/api/workspace")).json();
  expect(workspace.data.user.login).toBe(loginName);
  expect(workspace.data.user.role).toBe("student");
  expect(workspace.data.user.name).toContain("Ника");
  expect(workspace.data.requests).toHaveLength(0);
  expect(workspace.data.grades.length).toBeGreaterThan(0);
  expect((await page.request.get("/api/requests/student-1-request-study")).status()).toBe(404);
});

test("two semester schedule observes holidays and working Saturday", async ({ page }) => {
  await login(page, "student2");
  await page.goto("/dashboard/schedule?date=2026-11-04&view=day");
  await expect(page.getByText("День народного единства", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".lesson")).toHaveCount(0);
  await page.goto("/dashboard/schedule?date=2027-02-20&view=day");
  await expect(page.locator(".lesson").first()).toBeVisible();
  await expect(page.getByText(/Учебная суббота/).first()).toBeVisible();
  await page.goto("/dashboard/schedule?date=2027-02-22&view=day");
  await expect(page.locator(".lesson")).toHaveCount(0);
  await expect(page.getByText(/Выходной: перенос с 20 февраля/).first()).toBeVisible();
  await page.goto("/dashboard/schedule?date=2027-04-12&view=week");
  await expect(page.locator(".lesson").first()).toBeVisible();
  await expect(page.getByLabel("Семестр")).toHaveValue("spring-2027");
});

test("teacher messages are private, persist, and receive staff reply", async ({
  browser,
}, info) => {
  const studentContext = await browser.newContext({ viewport: info.project.use.viewport });
  const otherContext = await browser.newContext();
  const staffContext = await browser.newContext({ viewport: info.project.use.viewport });
  const student = await studentContext.newPage();
  const other = await otherContext.newPage();
  const staff = await staffContext.newPage();
  await login(student, "student1");
  await login(other, "student2");
  await login(staff, "dean");
  await student.goto("/dashboard/teachers");
  await student.getByRole("button", { name: "Написать преподавателю" }).first().click();
  await student.getByLabel("Тема обращения").fill(`Вопрос по проекту ${info.project.name}`);
  await student
    .getByLabel("Сообщение", { exact: true })
    .fill("Можно уточнить требования к учебному проекту?");
  await student.getByRole("button", { name: "Отправить обращение" }).click();
  await expect(
    student.getByText("Можно уточнить требования к учебному проекту?", { exact: true }),
  ).toBeVisible();
  const threadId = new URL(student.url()).searchParams.get("thread");
  expect(threadId).toBeTruthy();
  expect((await other.request.get(`/api/teacher-threads/${threadId}/messages`)).status()).toBe(404);
  await student.reload();
  await expect(
    student.getByText("Можно уточнить требования к учебному проекту?", { exact: true }),
  ).toBeVisible();
  await staff.goto(`/dashboard/teachers?thread=${threadId}`);
  await staff
    .getByLabel("Ответ в диалоге")
    .fill("Да, приходите на консультацию во вторник. Ответ тестового сотрудника.");
  await staff.getByRole("button", { name: "Отправить ответ", exact: true }).click();
  await student.reload();
  await expect(
    student.getByText("Да, приходите на консультацию во вторник. Ответ тестового сотрудника.", {
      exact: true,
    }),
  ).toBeVisible();
  await student.screenshot({
    path: `docs/screenshots/teacher-thread-${info.project.name}.png`,
    fullPage: true,
  });
  await studentContext.close();
  await otherContext.close();
  await staffContext.close();
});
