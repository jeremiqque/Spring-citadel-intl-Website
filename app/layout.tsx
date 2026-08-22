import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Aeonik (licensed) loaded from local TTF files in app/fonts/.
// This is the marketing site's brand font and must stay on <html>.
const aeonik = localFont({
  src: [
    { path: "./fonts/Aeonik-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Aeonik-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Aeonik-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-aeonik",
  display: "swap",
});

// REMOVED: Inter. It was loaded from Google Fonts on every page with a
// comment saying the portal used it for tabular numerals — but `--font-inter`
// was referenced nowhere in the codebase, and globals.css sets the portal to
// Aeonik. It was a dead network request on every page load, blocking on a
// third-party origin, for a font that never rendered.
//
// The tabular-numeral guarantee it was chosen for is provided directly by
// `font-variant-numeric: tabular-nums` in globals.css — see the .portal rules
// there, which now cover figures outside tables too.

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
    <html
      lang="en"
      className={`${aeonik.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
