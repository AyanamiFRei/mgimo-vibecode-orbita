import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { ThemeProvider, type ThemePreference } from "@/components/theme-provider";
import "./globals.css";
import "./themes.css";

export const metadata: Metadata = {
  title: { default: "Орбита — студенческий кабинет", template: "%s · Орбита" },
  description:
    "Конкурсный прототип цифрового деканата вымышленного Университета новых горизонтов. Все данные вымышлены.",
  icons: { icon: "/icon.svg" },
};
async function readTheme(): Promise<ThemePreference> {
  const value = (await cookies()).get("orbita-theme")?.value;
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await readTheme();
  return {
    width: "device-width",
    initialScale: 1,
    colorScheme: theme === "system" ? "light dark" : theme,
    themeColor:
      theme === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: "#f6f7f3" },
            { media: "(prefers-color-scheme: dark)", color: "#171b19" },
          ]
        : theme === "dark"
          ? "#171b19"
          : "#f6f7f3",
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = await readTheme();
  return (
    <html lang="ru" data-scroll-behavior="smooth" data-theme={theme}>
      <body>
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
