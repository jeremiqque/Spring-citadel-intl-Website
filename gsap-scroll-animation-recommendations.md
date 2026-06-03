# GSAP Scroll Animation Recommendations — Spring Citadel International School

Recommendations only — nothing implemented yet. Tuned for a **bright, friendly, trustworthy** school site for parents: motion should feel **warm, smooth, and reassuring — never flashy or distracting.** Every pattern below is paired with example sites and notes on mobile behaviour and `prefers-reduced-motion`.

---

## Guiding principles (read first)

For a primary/secondary school audience, the goal of motion is **calm confidence**, not spectacle. Three rules shape everything below:

1. **Subtle > showy.** Short distances (20–40px), gentle eases (`power2.out` / `power3.out`), durations 0.5–0.9s. Avoid bounce/elastic, big rotations, and parallax that makes parents feel seasseasick. Award-winning education sites (International Grammar School, Here's Ocean School) lean on *clean, smooth, minimalist* motion rather than heavy effects.
2. **Reveal once, then leave it.** Use `ScrollTrigger` with `toggleActions: "play none none none"` (play on enter, never reverse). Content that re-animates every time it scrolls into view feels gimmicky and tiring on a content-heavy school site.
3. **Accessibility is non-negotiable here.** Wrap *all* motion in `gsap.matchMedia()` with a `(prefers-reduced-motion: reduce)` branch that shows content in its final state (opacity 1, no transform) with no scroll-linked movement. Consider also an on-page motion toggle, since many parents won't have the OS setting. ([GSAP matchMedia docs](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) · [Smashing Magazine — respecting motion preferences](https://www.smashingmagazine.com/2021/10/respecting-users-motion-preferences/))

**Foundation stack:** GSAP + ScrollTrigger, optional light smooth-scroll (Lenis) kept gentle, and SplitText for the hero only. Use `gsap.matchMedia()` to also *reduce* (not just disable) motion on mobile — smaller translate distances, shorter durations, no pinning.

---

## 1. Hero heading — "Welcome to Spring Citadel Int'l School"

**Recommendation: friendly line-by-line rise + soft fade, on load (not scroll).**
Split the headline into lines with SplitText, then reveal each line from ~40px below with `opacity 0→1`, stagger ~0.12s, `power3.out`, ~0.8s. Pair it with the cartoon school-building illustration easing in slightly after the text (gentle fade + small scale 0.96→1, or a soft float settle) so the scene "assembles" warmly.

- **Why this over a mask/clip wipe:** clip wipes read as edgy/editorial. A soft rise-and-fade feels approachable and trustworthy — right for parents.
- **Optional warmth touch:** a very subtle, slow continuous float on the illustration (2–3px, 4s yoyo) after entrance so the hero feels alive without distracting.
- **Mobile:** reduce rise distance to ~20px, drop any illustration parallax, keep the stagger.
- **Reduced motion:** show headline and illustration fully visible immediately; skip float.

**Sites/refs:** [Awwwards — GSAP gallery](https://www.awwwards.com/websites/gsap/) · [International Grammar School & Here's Ocean School write-ups (Colorlib)](https://colorlib.com/wp/school-websites-designs/) · [Medium — Awwwards animation techniques (stagger, SplitText)](https://medium.com/design-bootcamp/awwward-winning-animation-techniques-for-websites-cb7c6b5a86ff)

---

## 2. Marquee / CTA strips — "Ready to enrol your child?" band

**Recommendation: slow, steady, continuous drift — looping, not scroll-jumpy.**
Use a seamless `xPercent` loop with `gsap.utils.wrap`. Keep it **slow and even** (a full loop ~25–40s) so it reads as friendly ambient motion and stays legible. The brand-blue band (`#2721F2`) is your accent, so let it move with confidence but not urgency.

- **Speed/direction:** one direction, constant speed. For a school site, **skip the scroll-velocity skew/smear** — it's a cool editorial trick but feels too "agency" and slightly chaotic for parents. If you have two strips, run them in gentle opposite directions for rhythm.
- **Pause on hover** (and respect reduced motion by stopping entirely) is a nice, considerate touch.
- **Mobile:** keep it; just ensure font size lets at least the full phrase read. Continuous loops are cheap and perform well on mobile.
- **Reduced motion:** stop the loop and display the phrase statically (centred), still as a clear CTA.

**Sites/refs:** [Envato Tuts+ — GSAP horizontal marquee](https://webdesign.tutsplus.com/how-to-build-horizontal-marquee-effects-with-gsap--cms-108794t) · [GSAP Vault — Infinite Marquee](https://gsapvault.com/effects/infinite-marquee) · [Made With GSAP](https://madewithgsap.com/)

---

## 3. Desaturated images (`mix-blend-mode: luminosity`) revealing on scroll

**Recommendation: soft clip-path reveal + gentle inner zoom, and YES — resolve to full colour.**
As each image enters, animate a `clip-path` inset open (bottom-up, ~0.8s `power3.out`) while the inner `<img>` settles from scale 1.06→1. The signature, on-brand move: **transition `mix-blend-mode: luminosity → normal`** (or animate a grayscale/`backdrop` overlay out) so the photo "warms into colour" as it arrives. This is delightful and reinforces a hopeful, lively feel — perfect for a school.

- Keep the desaturated state as the resting state for decorative/background images, and let **feature images** (children learning, campus life) warm to full colour on reveal — colour draws the eye to the human moments parents care about.
- Do it **once** and hold full colour; don't re-desaturate on scroll-away.
- **Mobile:** keep the colour resolve (it's the charming part); shorten clip duration to ~0.5s and reduce inner zoom to 1.03→1 to avoid layout cost.
- **Reduced motion:** show the image at final state (full colour, no clip, no zoom) immediately.
- **Gotcha:** call `ScrollTrigger.refresh()` after images load so clip reveals don't misalign.

**Sites/refs:** [GSAP forum — clip-path image reveal + refresh gotcha](https://gsap.com/community/forums/topic/43868-gsap-scrolltrigger-image-reveal-animation-with-clip-path-shows-misaligned-sections-after-animation/) · [FreeFrontend — 59+ ScrollTrigger examples](https://freefrontend.com/scroll-trigger-js/) · [Awwwards — scroll animation inspiration](https://www.awwwards.com/inspiration_search/gsap-animation/)

---

## 4. Alternating 2-column sections (About us, Our Academics)

**Recommendation: gentle directional reveal that respects the alternation — no pinning.**
For each row, fade-and-rise the text block (~30px up) and slide the image in from the outer edge (~40px from left on left-image rows, from right on right-image rows), stagger text then image by ~0.15s. This subtly emphasises the zig-zag layout and feels organised and calm.

- **Skip sticky pinning here.** Pinning is great for editorial drama but can feel disorienting to parents and is fiddly on mobile. Save attention for content, not mechanics.
- Optional **micro-parallax** on just the image (moves ~8–12px slower than scroll) for a touch of depth — keep it tiny.
- Reveal **once**; don't reverse.
- **Mobile:** columns stack — switch both blocks to a simple fade-up (~20px), drop the horizontal slide and parallax entirely.
- **Reduced motion:** everything visible at rest, no movement.

**Sites/refs:** [Awwwards — Scroll Animations](https://www.awwwards.com/inspiration/scroll-animations) · [Medium — Awwwards techniques (reveal, parallax, stagger)](https://medium.com/design-bootcamp/awwward-winning-animation-techniques-for-websites-cb7c6b5a86ff) · [ICreator Studio — scroll-triggered GSAP tutorial](https://icreatorstudio.com/blog/gsap-scroll-animation-website-tutorial)

---

## 5. Stat numbers — 98%, 120+, 25+

**Recommendation: yes — count-up on scroll, triggered once when the stats enter view.**
Animate each number from 0 to its target over ~1.5–2s with `power1.out`, started by a ScrollTrigger when the band enters. Use an `onUpdate` to round and re-append the suffix (`%`, `+`). Stagger the three so they don't all finish at once (~0.15s apart) — it feels lively and intentional.

- This is a high-trust, high-impact moment (proof points for parents). Count-ups draw the eye and make the numbers feel earned — a well-loved, parent-friendly effect.
- **Format carefully:** keep the suffix glued to the number every frame; for any comma values, format in `onUpdate`.
- **Run once.** Re-counting on every scroll-in is annoying.
- **Mobile:** keep it (cheap, performant); maybe shorten to ~1.2s.
- **Reduced motion:** render the final numbers immediately (98%, 120+, 25+) with no count.

**Sites/refs:** [Chris Soul — count up numbers with GSAP](https://www.chris9soul.com/blog/animate-numbers-gsap/) · [GSAP forum — ScrollTrigger count-up](https://gsap.com/community/forums/topic/32881-scrolltrigger-count-up-number-on-scroll-horizontal/) · [Webflow Showcased — GSAP count-up demo](https://showcased.webflow.io/projects/gsap-countup-demo)

---

## 6. Card grids — "Why Choose Us" (5), "Our Classes" (4), Gallery tiles

**Recommendation: batched, staggered fade-up — the workhorse pattern.**
Use `ScrollTrigger.batch()` to reveal cards as they enter, each fading up ~30px with a stagger of ~0.08–0.12s (`power2.out`, ~0.6s). Batching means cards animate in the small groups that actually enter the viewport, which looks natural on long grids and works identically across breakpoints.

- **Order:** left-to-right, top-to-bottom stagger reads as friendly and orderly. Avoid random/scatter reveals — too playful-chaotic for the trustworthy tone.
- **Why Choose Us / Our Classes:** add a soft hover lift (translateY -4px + subtle shadow, CSS) for tactility — separate from the scroll reveal.
- **Gallery tiles:** combine the batch fade-up with the colour-resolve from Section 3 for a cohesive, cheerful gallery.
- **Mobile:** cards become 1–2 columns; keep the same batch fade-up with a slightly smaller rise (~20px). Batching handles the reflow well.
- **Reduced motion:** all cards visible at rest; keep only the CSS hover lift (hover is fine under reduced-motion as it's user-initiated and small).

**Sites/refs:** [GSAP docs — ScrollTrigger (`.batch()`)](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) · [FreeFrontend — ScrollTrigger examples](https://freefrontend.com/scroll-trigger-js/) · [Awwwards — GSAP nominees](https://www.awwwards.com/inspiration_search/gsap-animation/)

---

## Quick decision summary

| Section | Primary pick | Lighter alternative | Mobile | Reduced motion |
|---|---|---|---|---|
| Hero heading | SplitText line rise + fade on load, illustration eases in | Whole-heading fade-up | Smaller rise, no parallax | Show immediately |
| Marquee / CTA band | Slow steady continuous loop | Two strips, opposite directions | Keep, ensure legible | Static phrase |
| Desaturated images | Clip reveal + zoom + **warm to colour** | Fade + colour resolve | Shorter, keep colour resolve | Final colour, no motion |
| 2-column sections | Text fade-up + image edge slide (no pin) | Both fade-up only | Stack → fade-up | All visible |
| Stat numbers | **Count-up once** on enter, staggered | Fade-up, no count | Keep, ~1.2s | Final numbers shown |
| Card grids | `ScrollTrigger.batch()` staggered fade-up | Simple fade-up | Same, smaller rise | Visible + CSS hover only |

**Decisions worth settling first:**
1. **Smooth scroll (Lenis) — in or out?** It makes everything feel premium but adds weight and a little complexity; for a content-heavy school site it's optional. This choice affects how all the above are wired.
2. **Do you want feature images to warm to full colour** (Section 3), or stay desaturated for a more uniform editorial look? This sets the emotional tone of the whole site.
3. **On-page motion toggle** in addition to OS `prefers-reduced-motion`? Recommended for a parent audience.

Tell me your picks per row and I can move to implementation, building everything inside a single `gsap.matchMedia()` setup so desktop / mobile / reduced-motion are all handled cleanly from the start.
