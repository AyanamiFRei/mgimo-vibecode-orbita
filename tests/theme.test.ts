import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RootLayout, { generateViewport } from "@/app/layout";
import { ThemeToggle } from "@/components/theme-toggle";

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "orbita-theme" && cookie.value !== undefined
        ? { name, value: cookie.value }
        : undefined,
  }),
}));

beforeEach(() => {
  cookie.value = undefined;
});

describe("server-rendered theme preference", () => {
  it("renders a saved dark preference and a pressed accessible toggle before browser JavaScript", async () => {
    cookie.value = "dark";
    const html = renderToStaticMarkup(await RootLayout({ children: createElement(ThemeToggle) }));
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('aria-label="Тёмная тема"');
    expect(html).toContain('aria-pressed="true"');
    expect((await generateViewport()).colorScheme).toBe("dark");
  });

  it("renders an explicit light preference even when the browser may prefer dark", async () => {
    cookie.value = "light";
    const html = renderToStaticMarkup(await RootLayout({ children: createElement(ThemeToggle) }));
    expect(html).toContain('data-theme="light"');
    expect(html).toContain('aria-pressed="false"');
    expect((await generateViewport()).colorScheme).toBe("light");
  });

  it("leaves first-visit system preference to CSS and provides both browser theme colors", async () => {
    const html = renderToStaticMarkup(
      await RootLayout({ children: createElement("main", null, "Орбита") }),
    );
    expect(html).toContain('data-theme="system"');
    const viewport = await generateViewport();
    expect(viewport.colorScheme).toBe("light dark");
    expect(viewport.themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#f6f7f3" },
      { media: "(prefers-color-scheme: dark)", color: "#171b19" },
    ]);
  });

  it("rejects unsupported cookie values instead of reflecting them into page attributes", async () => {
    cookie.value = 'dark" onload="bad';
    const html = renderToStaticMarkup(await RootLayout({ children: createElement("main") }));
    expect(html).toContain('data-theme="system"');
    expect(html).not.toContain("onload");
    expect((await generateViewport()).colorScheme).toBe("light dark");
  });
});
