// Proves that shadcn/ui's tokens are confined to .portal and have not leaked
// into the marketing site.
//
//   npm run build && npx next start -p 3100
//   node docs/baseline/leak-check.mjs
//
// Exit 0 = clean, 1 = a leak was found. Faster and more precise than a pixel
// diff for this specific risk: it reads computed styles straight from the
// browser rather than inferring from pixels.
//
// Requires: npm i -D playwright && npx playwright install chromium

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const PAGES = ["/", "/about", "/academics", "/gallery", "/contact"];

// Tokens shadcn defines. None of these may resolve outside .portal.
const TOKENS = [
  "--background", "--foreground", "--card", "--popover", "--primary",
  "--secondary", "--muted", "--accent", "--destructive", "--border",
  "--input", "--ring", "--radius", "--sidebar",
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

let failures = 0;
const fail = (msg) => { console.log("  FAIL " + msg); failures++; };
const ok = (msg) => console.log("  ok   " + msg);

for (const route of PAGES) {
  console.log("\n" + route);
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });

  const result = await page.evaluate((tokens) => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const defined = tokens.filter((t) => root.getPropertyValue(t).trim() !== "");

    // Any element that actually paints a border, coloured with shadcn's
    // neutral --border, means the global @layer base rule came back.
    const borrowed = [];
    for (const el of document.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      if (parseFloat(cs.borderTopWidth) > 0) {
        const c = cs.borderTopColor;
        if (c.includes("oklch") || c === "rgb(235, 235, 235)") {
          borrowed.push(el.tagName + " " + c);
        }
      }
    }

    return {
      definedTokens: defined,
      bodyFont: body.fontFamily,
      aeonikVar: root.getPropertyValue("--font-aeonik").trim(),
      portalOnPage: !!document.querySelector(".portal"),
      borrowedBorders: borrowed.slice(0, 5),
    };
  }, TOKENS);

  if (result.definedTokens.length === 0) ok("no shadcn tokens resolve at :root");
  else fail("shadcn tokens leaked to :root -> " + result.definedTokens.join(", "));

  if (/aeonik/i.test(result.bodyFont)) ok("body font is Aeonik  (" + result.bodyFont.split(",")[0] + ")");
  else fail("body font is NOT Aeonik -> " + result.bodyFont);

  if (result.aeonikVar !== "") ok("--font-aeonik is defined on <html>");
  else fail("--font-aeonik is undefined - layout.tsx lost aeonik.variable");

  if (!/inter/i.test(result.bodyFont)) ok("Inter is not applied to marketing body");
  else fail("Inter leaked into marketing body -> " + result.bodyFont);

  if (result.borrowedBorders.length === 0) ok("no element borrows shadcn's --border colour");
  else fail("shadcn border colour applied -> " + result.borrowedBorders.join(" | "));

  if (!result.portalOnPage) ok("no .portal wrapper on this marketing page");
  else fail(".portal wrapper found on a marketing page");
}

await browser.close();

console.log(
  failures === 0
    ? "\nClean. shadcn is confined to .portal; the marketing site is unaffected."
    : `\n${failures} leak(s) found. Fix the scoping in app/globals.css before continuing.`
);

process.exit(failures === 0 ? 0 : 1);
