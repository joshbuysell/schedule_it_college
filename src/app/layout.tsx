import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"] });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "cyrillic"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "Розклад занять — ІТ коледж Львівської політехніки", template: "%s · Розклад ІТ коледжу" },
  description: "Розклад занять груп і викладачів Фахового коледжу інформаційних технологій НУ «Львівська політехніка».",
  icons: { icon: "/logo-lit.jpg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1016" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body className={`${manrope.variable} ${unbounded.variable} min-h-dvh antialiased`}>{children}</body>
    </html>
  );
}
