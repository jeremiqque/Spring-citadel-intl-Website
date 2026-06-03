# GSAP Scroll Animation Recommendations — Dark Editorial / Massive Typography

Recommendations only — nothing implemented yet. Each section gives the pattern, why it fits a dark editorial look with oversized condensed type, and real sites that use the technique so you can choose.

## Foundation (applies to everything below)

Before any of the section animations, two libraries do the heavy lifting on award-winning sites of this style:

- **GSAP + ScrollTrigger** — drives every scroll-linked animation with precise start/end control.
- **A smooth-scroll layer (Lenis, occasionally Locomotive)** — almost every dark-editorial Awwwards site uses this. It removes native scroll jank and lets typography and image reveals feel "weighted" and filmic. This is the single biggest contributor to the premium feel; recommend adding it first.
- **GSAP SplitText** — splits headings into lines/words/chars for staggered reveals. Essential for massive typography.

A practical rule for this aesthetic: **animations should feel heavy and confident, not bouncy.** Favor custom eases (`power3.out`, `expo.out`, or custom cubic-beziers), longer durations (0.8–1.2s), and generous stagger — not elastic/overshoot easing.

---

## 1. Entrance animation for massive condensed typography

**Recommendation: line-by-line mask reveal with `SplitText` + `overflow: hidden` clip.**
Split the headline into lines, wrap each line in a clipping container, and slide each line up from 100% with a stagger (~0.08–0.12s) on `expo.out`. For huge condensed type this reads as the words being "wiped" into place from behind a mask — far classier than a plain fade.

- **Alternative A — per-character stagger:** good for short hero words (one or two words). Heavier characters reveal in sequence. Use only for short headings; on long paragraphs it gets noisy.
- **Alternative B — blur + y-translate fade:** `filter: blur(12px) → 0` combined with a small upward move. Softer, more "editorial print" feel; pairs well with dark backgrounds.

**Why:** Mask/clip reveals are the dominant pattern for oversized type on Awwwards GSAP sites because the type is large enough that the wipe motion itself becomes the visual event.

**Sites / references:** [Awwwards — GSAP gallery](https://www.awwwards.com/websites/gsap/) · [Awwwards — "Introduction with scroll animations, photo/video & typography" (L'étude)](https://www.awwwards.com/inspiration/introduction-with-scroll-animations-of-photo-video-and-typography-letude-1) · [GSAP Vault — Split Text Stagger Reveal](https://gsapvault.com/effects/split-text-reveal) · [LESA on Awwwards](https://www.awwwards.com/sites/lesa-2)

---

## 2. Marquee tickers (speed & direction)

**Recommendation: continuous GSAP loop using `xPercent` + `gsap.utils.wrap`, with scroll-velocity influence.**
Base it on a slow constant drift (the marquee always moves even when idle), then **add the scroll velocity on top** so it speeds up while scrolling and eases back to base speed when scrolling stops. Reverse direction based on scroll direction for a tactile, "physical" feel.

- **Speed:** slow base drift (think ~20–40s per full loop). It should feel like ambient motion, not a news ticker. Velocity coupling gives the lively bursts.
- **Direction:** if you have two stacked marquees, run them in **opposite directions** — a signature editorial move that creates depth and rhythm.
- **Optional polish:** a slight `skewX` driven by velocity (clamped, e.g. max ~8–10°) so fast scroll smears the type subtly.

**Sites / references:** [Envato Tuts+ — horizontal marquee with GSAP (opposite directions via data attr)](https://webdesign.tutsplus.com/how-to-build-horizontal-marquee-effects-with-gsap--cms-108794t) · [GSAP Vault — Infinite Marquee](https://gsapvault.com/effects/infinite-marquee) · [DMmotionarts — change marquee direction on scroll](https://dmmotionarts.com/change-direction-of-marquee-based-on-scroll-elementor-and-gsap-tutorial/) · [Codrops — infinite scroll with GSAP & Lenis](https://tympanus.net/codrops/2026/05/28/the-never-ending-story-building-a-seamless-infinite-scroll-experience-with-gsap-lenis/)

---

## 3. Desaturated images revealing on scroll

**Recommendation: `clip-path` inset/curtain reveal, paired with an inner-image scale (parallax).**
Animate the container's `clip-path` from a closed inset to fully open as the element enters the viewport, while the `<img>` inside starts at ~1.2 scale and settles to 1. The mismatch between mask and image creates the "the image is being uncovered, not just appearing" feel that defines this style.

- **For your desaturated treatment specifically:** consider animating saturation/brightness on reveal too — start near-black or fully desaturated and resolve to the final desaturated state, so the reveal has a "developing photo" quality without breaking the muted palette.
- **Keep it directional:** reveal from bottom or from one edge consistently across the site so it reads as a system, not random effects.
- **Watch-out from the field:** clip-path reveals can leave sections misaligned if `ScrollTrigger.refresh()` isn't called after layout/image load — budget for that.

**Sites / references:** [GSAP forum — image reveal with clip-path (and the misalignment gotcha)](https://gsap.com/community/forums/topic/43868-gsap-scrolltrigger-image-reveal-animation-with-clip-path-shows-misaligned-sections-after-animation/) · [YouTube — ScrollTrigger reveal-on-scroll clip-path walkthrough](https://www.youtube.com/watch?v=AaO-LmExmkM) · [FreeFrontend — 59+ ScrollTrigger examples](https://freefrontend.com/scroll-trigger-js/)

---

## 4. Two-column text sections

**Recommendation: asymmetric entrance + sticky pinning.**
Pin the left (or heading) column with `ScrollTrigger` while the right column's content scrolls/reveals past it. As each block enters, run the same line-mask reveal from Section 1 at a smaller scale (shorter duration, tighter stagger). Add a small parallax offset between the two columns (e.g. column A moves at 0.9×, column B at 1.05×) for subtle depth.

- Keep body-copy reveals **subtle** — fade + 20–30px rise, not big masks. The drama should stay reserved for the display type.
- For editorial layouts, staggering paragraph **lines** (not the whole block at once) is what makes copy feel "set in motion" rather than popped in.

**Sites / references:** [Awwwards — Scroll Animations inspiration](https://www.awwwards.com/inspiration/scroll-animations) · [Medium — Awwwards-winning animation techniques (pinning, parallax, stagger)](https://medium.com/design-bootcamp/awwward-winning-animation-techniques-for-websites-cb7c6b5a86ff) · [Made With GSAP](https://madewithgsap.com/)

---

## 5. Should city names animate differently from normal text?

**Recommendation: yes — treat them as display moments, not body text.**
City names are great "anchor" elements in editorial design. Differentiate them with one of:

- **Per-character stagger reveal** (vs. line-mask for headings) so they read as a distinct typographic gesture.
- **Pinned + horizontal drift:** pin the city name and let it slide horizontally a short distance as you scroll through its section (ties nicely into the marquee language).
- **Hover/scroll accent:** swap weight, add an outline-to-fill transition, or reveal a small coordinate/label beside them.

Keeping a *consistent but separate* motion vocabulary for city names (always char-stagger, say) helps users subconsciously read them as a recurring system element.

**Sites / references:** [Awwwards — GSAP nominees](https://www.awwwards.com/inspiration_search/gsap-animation/) · [GSAP Vault — Split Text Reveal (char mode)](https://gsapvault.com/effects/split-text-reveal)

---

## 6. The blue marquee strip

**Recommendation: make it the one high-energy, high-saturation accent — velocity-reactive and pinned-aware.**
Against a dark, desaturated palette, the blue strip is your color punch, so let its motion match its visual weight:

- Continuous drift (as in Section 2) but slightly **faster** than other marquees so it reads as the "live wire" of the page.
- **Scroll-velocity skew** clamped to ~10° so fast scrolling smears the blue — most effective on a saturated strip against muted surroundings.
- Optional: **pin the strip briefly** as it hits center viewport and let the text race through during the pin, then release — turns a passive ticker into a deliberate beat in the scroll narrative.
- Keep it a single line and tall enough that the oversized type bleeds top/bottom (cropped letterforms) for the editorial edge.

**Sites / references:** [CodePen (GreenSock) — skew on scroll velocity](https://codepen.io/GreenSock/pen/eYpGLYL) · [GSAP forum — skew on scroll velocity (quickSetter + clamp)](https://gsap.com/community/forums/topic/25971-skew-on-scroll-velocity/) · [Webflow — horizontal scroll with parallax + velocity skew](https://webflow.com/made-in-webflow/website/horizontal-scroll-parallax-skew)

---

## Quick decision summary

| Section | Primary pick | Lighter alternative |
|---|---|---|
| Massive headings | Line-mask reveal (SplitText + clip) | Blur + y-fade |
| Marquee tickers | Constant drift + scroll velocity, opposite directions | Plain constant loop |
| Desaturated images | clip-path curtain + inner scale | Simple fade + scale |
| 2-column text | Sticky pin + line-stagger copy + slight parallax | Fade-rise on enter |
| City names | Per-char stagger / pinned horizontal drift | Treat as heading |
| Blue strip | Faster drift + clamped velocity skew (+ optional pin) | Match other marquees |

**Suggested next step:** pick one option per row, then decide whether you want the smooth-scroll layer (Lenis) in — that choice affects how all of the above are wired, so it's worth settling first.
