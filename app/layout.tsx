import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Орбита — твоя студенческая жизнь", template: "%s · Орбита" },
  description:
    "Конкурсный прототип цифрового деканата вымышленного Университета новых горизонтов. Все данные вымышлены.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6f7f3" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
