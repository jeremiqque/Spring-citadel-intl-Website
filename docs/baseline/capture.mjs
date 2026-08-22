// Baseline screenshot capture for the Spring Citadel marketing site.
//
// Usage:
//   npm run build && npx next start -p 3100
//   node docs/baseline/capture.mjs --out docs/baseline          # first run (baseline)
//   node docs/baseline/capture.mjs --out docs/after             # after a change
//   node docs/baseline/compare.mjs docs/baseline docs/after     # diff them
//
// Requires: npm i -D playwright pixelmatch pngjs
//
// Why a script and not manual screenshots: the point of the baseline is a
// byte-comparable diff. Hand-taken shots differ in scroll position, animation
// frame and image-load timing, which makes them useless for that.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const PAGES = [
  ["home", "/"],
  ["about", "/about"],
  ["academics", "/academics"],
  ["gallery", "/gallery"],
  ["contact", "/contact"],
];

const VIEWS = [
  ["desktop-1440", 1440, 900],
  ["mobile-390", 390, 844],
];

const argOut = process.argv.indexOf("--out");
const OUT = argOut > -1 ? process.argv[argOut + 1] : "docs/baseline";
const BASE = process.env.BASE_URL || "http://localhost:3100";

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const [vname, width, height] of VIEWS) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    // Freeze GSAP reveals and the footer marquee, so every run is identical.
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();

  for (const [pname, route] of PAGES) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Instant scrolling - globals.css sets scroll-behavior: smooth, which would
    // make the scroll-through below take minutes.
    await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });

    // Scroll the full height to trigger every next/image lazy load, then return
    // to the top and wait for any still-pending image.
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await Promise.all(
        Array.from(document.images)
          .filter((i) => !i.complete)
          .map((i) => new Promise((r) => { i.onload = i.onerror = r; }))
      );
    });

    await page.waitForTimeout(700);

    const file = path.join(OUT, `${pname}-${vname}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("saved", file);
  }

  await ctx.close();
}

await browser.close();
