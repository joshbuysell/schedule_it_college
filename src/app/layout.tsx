import type { Metadata, Viewport } from "next";
import { Montserrat, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Розклад занять — ІТ коледж Львівської політехніки", template: "%s · Розклад ІТ коледжу" },
  description: "Розклад занять груп і викладачів Фахового коледжу інформаційних технологій НУ «Львівська політехніка».",
  icons: { icon: "/logo-lit.jpg" },
};

export const viewport: Viewport = {
  themeColor: "#323a8d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body className={`${poppins.variable} ${montserrat.variable} min-h-dvh antialiased`}>{children}</body>
    </html>
  );
}
