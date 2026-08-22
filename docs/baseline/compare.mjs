// Pixel-diff two screenshot directories produced by capture.mjs.
//
//   node docs/baseline/compare.mjs docs/baseline docs/after
//
// Exit code 0 = identical, 1 = differences found (so it can gate a commit).
// Writes <name>-diff.png into the second directory for anything that differs.
//
// Requires: npm i -D pixelmatch pngjs

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const [, , dirA, dirB] = process.argv;
if (!dirA || !dirB) {
  console.error("usage: node compare.mjs <baseline-dir> <after-dir>");
  process.exit(2);
}

const shots = fs
  .readdirSync(dirA)
  .filter((f) => f.endsWith(".png") && !f.endsWith("-diff.png"));

let failed = 0;

for (const name of shots) {
  const pathA = path.join(dirA, name);
  const pathB = path.join(dirB, name);

  if (!fs.existsSync(pathB)) {
    console.log(`MISSING  ${name}`);
    failed++;
    continue;
  }

  const a = PNG.sync.read(fs.readFileSync(pathA));
  const b = PNG.sync.read(fs.readFileSync(pathB));

  if (a.width !== b.width || a.height !== b.height) {
    console.log(
      `SIZE     ${name}  ${a.width}x${a.height} -> ${b.width}x${b.height}`
    );
    failed++;
    continue;
  }

  const diff = new PNG({ width: a.width, height: a.height });
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: 0.1,
  });

  if (changed > 0) {
    const out = path.join(dirB, name.replace(/\.png$/, "-diff.png"));
    fs.writeFileSync(out, PNG.sync.write(diff));
    const pct = ((changed / (a.width * a.height)) * 100).toFixed(3);
    console.log(`CHANGED  ${name}  ${changed} px (${pct}%)  -> ${out}`);
    failed++;
  } else {
    console.log(`ok       ${name}`);
  }
}

console.log(
  failed === 0
    ? "\nAll screenshots identical - the marketing site is untouched."
    : `\n${failed} screenshot(s) differ. Inspect the -diff.png files before continuing.`
);

process.exit(failed === 0 ? 0 : 1);
