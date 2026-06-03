"use client";

import type { RefObject } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";

/**
 * Count-up for stat numbers.
 *
 * Mark each number element with:
 *   data-count="98" data-suffix="%"   (data-prefix optional)
 * and render the final value as its text (so it's correct without JS).
 *
 * On enter, each counts 0 → target once, staggered ~0.15s in DOM order.
 * Reduced-motion: numbers are simply shown at their final value.
 */
export function useCountUp(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const els = gsap.utils.toArray<HTMLElement>("[data-count]", scope.current);
      const finalText = (el: HTMLElement) =>
        (el.dataset.prefix ?? "") + (el.dataset.count ?? "") + (el.dataset.suffix ?? "");

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        els.forEach((el, i) => {
          const target = parseFloat(el.dataset.count ?? "0");
          const prefix = el.dataset.prefix ?? "";
          const suffix = el.dataset.suffix ?? "";
          const obj = { v: 0 };
          el.textContent = prefix + "0" + suffix;

          gsap.to(obj, {
            v: target,
            duration: 1.6,
            delay: i * 0.15,
            ease: "power1.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
            onUpdate: () => {
              el.textContent = prefix + Math.round(obj.v) + suffix;
            },
          });
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        els.forEach((el) => {
          el.textContent = finalText(el);
        });
      });
    },
    { scope }
  );
}

/**
 * Staggered fade-up for card grids using ScrollTrigger.batch().
 * Cards reveal in the small groups that enter the viewport, in DOM
 * (left-to-right, top-to-bottom) order — orderly, not scattered.
 * Reduced-motion: all cards shown immediately.
 */
export function useBatchReveal(
  scope: RefObject<HTMLElement | null>,
  selector: string
) {
  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>(selector, scope.current);
      if (!items.length) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const isMobile = window.matchMedia("(max-width: 640px)").matches;
        gsap.set(items, { y: isMobile ? 20 : 30, autoAlpha: 0 });

        ScrollTrigger.batch(items, {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              y: 0,
              autoAlpha: 1,
              duration: 0.6,
              ease: "power2.out",
              stagger: 0.1,
              overwrite: true,
            }),
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(items, { autoAlpha: 1, y: 0 });
      });
    },
    { scope }
  );
}
