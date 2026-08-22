# Marketing site baseline

Reference screenshots of the five public pages, used to prove the portal build never changed the
live marketing site.

## Why this exists

Package 0 of the portal build installs shadcn/ui, which writes CSS variables into
`app/globals.css` - a file the marketing site shares. These screenshots are the evidence that
scoping those variables under `.portal` worked.

Step 15 of the build plan is: re-capture, diff against the baseline, and **do not continue until
the diff is empty.**

## Generate the baseline (do this before installing shadcn)

```bash
npm i -D playwright pixelmatch pngjs
npx playwright install chromium

npm run build
npx next start -p 3100        # leave running in a second terminal

node docs/baseline/capture.mjs --out docs/baseline
```

That writes ten PNGs - five pages x two viewports.

**Capture the baseline on the same machine that will capture the comparison shots.** Chromium
renders text and image scaling slightly differently across versions and platforms, so a baseline
taken elsewhere produces false diffs on every page. This is why the images are generated locally
rather than shipped with the repo.

## Check for changes (after installing shadcn, and after any portal work)

```bash
npm run build
npx next start -p 3100

node docs/baseline/capture.mjs --out docs/after
node docs/baseline/compare.mjs docs/baseline docs/after
```

`compare.mjs` exits 0 when everything matches and 1 otherwise, so it can gate a commit. When a
page differs it writes `<name>-diff.png` next to the new shot with the changed pixels highlighted.

Delete `docs/after/` once you have checked it.

## What gets captured

| Page | Route |
| --- | --- |
| home | `/` |
| about | `/about` |
| academics | `/academics` |
| gallery | `/gallery` |
| contact | `/contact` |

At 1440 x 900 and 390 x 844, full page. `/portal` is deliberately excluded - it is the page being
replaced.

## Capture conditions

Held constant so any diff means a real change, not a timing artefact:

- **Production build**, not `next dev` - dev indicators and HMR would pollute the shots.
- **`reducedMotion: "reduce"`** - GSAP reveals and the footer marquee resolve to their final state
  instead of a random animation frame.
- **`scroll-behavior: auto`** injected - `globals.css` sets `smooth`, which makes the
  scroll-through take minutes.
- **Full-height scroll before capture** - forces every `next/image` lazy load, so no shot contains
  an unloaded placeholder.
- **`deviceScaleFactor: 1`** - keeps file sizes sane and pixel coordinates predictable.

## Pre-existing quirks, recorded 5 Aug 2026

Present before any portal work, so they are not later mistaken for regressions:

- **Academics** - two empty bordered boxes above "Our Classes" (`AcademicsMedia`, no images
  supplied yet).
- **Our Classes** - the Junior Secondary card is a solid blue block; `OurClasses.tsx` has no image
  for that level.
- **Footer marquee** - frozen mid-scroll by `reducedMotion`, so "READY TO ENROLL YOUR CHILD?"
  appears clipped at both edges. Expected, and identical on every run.

## Repo size

The ten PNGs total roughly 10 MB, and they must stay lossless for pixel-diffing to work. If that
weight in git is unwelcome, add this to `.gitignore`:

```
docs/baseline/*.png
docs/after/
```

The scripts and this README are the parts that genuinely need version control; the images can be
regenerated in two minutes from any clean checkout.
