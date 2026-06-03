import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Aeonik (licensed) loaded from local TTF files in app/fonts/.
const aeonik = localFont({
  src: [
    { path: "./fonts/Aeonik-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Aeonik-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Aeonik-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-aeonik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spring Citadel International School",
  description:
    "Welcome to Spring Citadel Int'l School — a school where learning meets character. Est. 2008, Niger, Nigeria.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={aeonik.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
