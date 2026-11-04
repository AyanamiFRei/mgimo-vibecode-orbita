"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className={`icon-button theme-toggle ${className}`.trim()}
      aria-label="Тёмная тема"
      aria-pressed={isDark}
      title={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      onClick={toggleTheme}
    >
      {/* CSS selects the right icon for system preference even before hydration. */}
      <Moon className="theme-icon-light" size={19} aria-hidden="true" />
      <Sun className="theme-icon-dark" size={19} aria-hidden="true" />
    </button>
  );
}
