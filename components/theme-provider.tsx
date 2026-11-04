"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
type ThemeContextValue = {
  theme: ThemePreference;
  isDark: boolean;
  toggleTheme: () => void;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);
const darkQuery = "(prefers-color-scheme: dark)";

function subscribeToSystemTheme(notify: () => void) {
  const media = window.matchMedia(darkQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
function systemThemeSnapshot() {
  return window.matchMedia(darkQuery).matches;
}
function serverThemeSnapshot() {
  return false;
}

function applyAppearance(theme: ThemePreference) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia(darkQuery).matches);
  // CSS resolves system preference before JavaScript; read its actual background for the browser chrome.
  const color =
    getComputedStyle(root).getPropertyValue("--bg").trim() || (dark ? "#171b19" : "#f6f7f3");
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = color;
  });
  document.querySelectorAll<HTMLMetaElement>('meta[name="color-scheme"]').forEach((meta) => {
    meta.content = theme === "system" ? "light dark" : theme;
  });
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: ThemePreference;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<ThemePreference>(initialTheme);
  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    systemThemeSnapshot,
    serverThemeSnapshot,
  );
  const isDark = theme === "dark" || (theme === "system" && systemDark);

  useEffect(() => {
    applyAppearance(theme);
  }, [theme, isDark]);

  const toggleTheme = useCallback(() => {
    const currentlyDark =
      theme === "dark" || (theme === "system" && window.matchMedia(darkQuery).matches);
    const next: ThemePreference = currentlyDark ? "light" : "dark";
    applyAppearance(next);
    // This is a public display preference, independent of login and never an authentication token.
    try {
      document.cookie = `orbita-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    } catch {
      // A browser that blocks cookies can still change the theme for the current page session.
    }
    setTheme(next);
  }, [theme]);

  const value = useMemo(() => ({ theme, isDark, toggleTheme }), [theme, isDark, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is required.");
  return context;
}
