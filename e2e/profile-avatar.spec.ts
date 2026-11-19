import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("a profile photo appears in the account, survives reload and can be removed", async ({
  page,
}, info) => {
  await page.goto("/login");
  await page.getByLabel("Логин", { exact: true }).fill("student2");
  await page.getByLabel("Пароль", { exact: true }).fill("OrbitDemo2026!");
  await page.getByRole("button", { name: "Войти в кабинет", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/dashboard/profile");
  const controls = page.locator(".profile-photo-controls");
  const file = controls.getByLabel("Выбрать фото");
  await file.setInputFiles({
    name: "text.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("text"),
  });
  await expect(controls.getByRole("alert")).toContainText(/JPEG|PNG|WebP/);
  const buffer = await sharp({
    create: { width: 100, height: 80, channels: 3, background: "teal" },
  })
    .png()
    .toBuffer();
  await file.setInputFiles({ name: "picture.png", mimeType: "image/png", buffer });
  await expect(controls.getByRole("status")).toHaveText("Фото сохранено.");
  const profilePhoto = page.locator(".profile-card .avatar img");
  await expect(profilePhoto).toBeVisible();
  const src = await profilePhoto.getAttribute("src");
  await expect(page.locator(".user-link .avatar img")).toHaveAttribute("src", src!);
  await page.reload();
  await expect(profilePhoto).toHaveAttribute("src", src!);
  expect(
    await profilePhoto.evaluate((image: HTMLImageElement) =>
      image.decode().then(() => image.naturalWidth),
    ),
  ).toBe(256);
  await page.screenshot({
    path: `output/qa/profile-photo-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Удалить фото" }).click();
  await expect(controls.getByRole("status")).toHaveText("Фото удалено.");
  await expect(profilePhoto).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Загрузить фото" })).toBeVisible();
});
