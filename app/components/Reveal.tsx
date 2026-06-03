"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Scroll-reveal wrapper for images / media blocks.
 *
 * - Soft clip-path "curtain" reveal (grows up from the bottom edge)
 *   combined with a gentle inner zoom settle.
 * - `feature` images additionally warm from desaturated → full colour
 *   (saturate 0 → 1) as they reveal. Decorative blocks stay desaturated.
 * - Reveals once, never reverses.
 * - Wrapped in gsap.matchMedia(): smaller motion on mobile, and a
 *   reduced-motion branch that shows everything in its final state.
 *
 * Put the sizing / rounding / background classes on `className`; the
 * inner element fills it and is the thing that zooms + recolours.
 */
export default function Reveal({
  children,
  feature = false,
  className = "",
  start = "top 85%",
}: {
  children: React.ReactNode;
  feature?: boolean;
  className?: string;
  start?: string;
}) {
  const clip = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const isMobile = window.matchMedia("(max-width: 640px)").matches;

        // Hidden start state: clipped away from the bottom, slightly zoomed.
        gsap.set(clip.current, { clipPath: "inset(100% 0% 0% 0%)" });
        gsap.set(inner.current, { scale: isMobile ? 1.03 : 1.06 });
        if (feature) gsap.set(inner.current, { filter: "saturate(0)" });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: clip.current,
            start,
            toggleActions: "play none none none",
          },
        });

        tl.to(
          clip.current,
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: isMobile ? 0.55 : 0.8,
            ease: "power3.out",
          },
          0
        ).to(
          inner.current,
          { scale: 1, duration: isMobile ? 0.6 : 1, ease: "power3.out" },
          0
        );

        if (feature) {
          tl.to(
            inner.current,
            { filter: "saturate(1)", duration: 1.1, ease: "power2.out" },
            0.1
          );
        }
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(clip.current, { clipPath: "none" });
        gsap.set(inner.current, { scale: 1 });
        if (feature) gsap.set(inner.current, { filter: "none" });
      });
    },
    { scope: clip }
  );

  return (
    <div ref={clip} className={className}>
      <div ref={inner} className="h-full w-full">
        {children}
      </div>
    </div>
  );
}
