import { expect, test, type Locator } from "@playwright/test";

async function expectIndicatorOnSelection(menu: Locator) {
  await expect(menu.locator(":scope > .selection-indicator")).toBeVisible();
  await expect
    .poll(() =>
      menu.evaluate((element) => {
        const current = element.querySelector(
          ':scope > [aria-current]:not([aria-current="false"])',
        );
        const indicator = element.querySelector(":scope > .selection-indicator");
        if (!current || !indicator) return false;
        const a = current.getBoundingClientRect();
        const b = indicator.getBoundingClientRect();
        return [a.x - b.x, a.y - b.y, a.width - b.width, a.height - b.height].every(
          (offset) => Math.abs(offset) < 1.5,
        );
      }),
    )
    .toBe(true);
}

test("filter and sidebar indicators track current links, including history and reduced motion", async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      if (this.classList.contains("selection-indicator")) this.setAttribute("data-animated", "");
      return animate.call(this, keyframes, options);
    };
  });
  await page.goto("/login");
  await page.getByLabel("Логин", { exact: true }).fill("student1");
  await page.getByLabel("Пароль", { exact: true }).fill("OrbitDemo2026!");
  await page.getByRole("button", { name: "Войти в кабинет", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/documents");

  const filters = page.getByRole("navigation", { name: "Фильтр заявок" });
  await expectIndicatorOnSelection(filters);
  const initialBox = await filters.getByRole("link", { name: "Все", exact: true }).boundingBox();
  const requests: string[] = [];
  page.on("request", (request) => {
    const { pathname, search } = new URL(request.url());
    if (pathname === "/dashboard/documents" && search.includes("filter=")) requests.push(search);
  });

  await filters.getByRole("link", { name: "В работе", exact: true }).click();
  await filters.getByRole("link", { name: "Готовые", exact: true }).press("Enter");
  await expect(page).toHaveURL(/\?filter=ready$/);
  await expectIndicatorOnSelection(filters);
  await expect(filters.locator(".selection-indicator")).toHaveAttribute("data-animated", "");
  expect(await filters.getByRole("link", { name: "Все", exact: true }).boundingBox()).toEqual(
    initialBox,
  );
  expect(requests).toEqual([]);
  await page.goBack();
  await expect(filters.getByRole("link", { name: "В работе", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expectIndicatorOnSelection(filters);

  const sidebar = page.getByRole("navigation", { name: "Основная навигация" });
  if (isMobile) await page.getByRole("button", { name: "Открыть меню" }).click();
  await expectIndicatorOnSelection(sidebar);
  await expect(sidebar.locator(".selection-indicator")).not.toHaveAttribute("data-animated");
  await sidebar.getByRole("link", { name: "Успеваемость", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/grades$/);
  if (isMobile) await page.getByRole("button", { name: "Открыть меню" }).click();
  await expectIndicatorOnSelection(sidebar);
  await expect(sidebar.locator(".selection-indicator")).toHaveAttribute("data-animated", "");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await sidebar
    .locator(".selection-indicator")
    .evaluate((el) => el.removeAttribute("data-animated"));
  await sidebar.getByRole("link", { name: "Уведомления", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/notifications$/);
  if (isMobile) await page.getByRole("button", { name: "Открыть меню" }).click();
  await expectIndicatorOnSelection(sidebar);
  await expect(sidebar.locator(".selection-indicator")).not.toHaveAttribute("data-animated");
  expect(
    await sidebar.locator(".selection-indicator").evaluate((el) => el.getAnimations().length),
  ).toBe(0);
  if (isMobile) await page.keyboard.press("Escape");
  const notificationFilters = page.getByRole("navigation", { name: "Фильтр уведомлений" });
  await notificationFilters.getByRole("link", { name: "Новости", exact: true }).click();
  await expectIndicatorOnSelection(notificationFilters);
  await page.setViewportSize({ width: 320, height: 750 });
  await expectIndicatorOnSelection(notificationFilters);
});
