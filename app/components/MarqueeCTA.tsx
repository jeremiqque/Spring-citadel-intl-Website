"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { PillButton } from "./ui";

// One repeating unit: CTA button + headline phrase.
function Unit({ hidden = false }: { hidden?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center gap-10 pr-10"
      aria-hidden={hidden || undefined}
    >
      <PillButton
        tone="solid-blue"
        size="lg"
        href="/contact"
        className="shrink-0 uppercase tracking-wide"
      >
        Get in touch today
      </PillButton>
      <span className="shrink-0 text-[clamp(40px,6vw,72px)] font-bold uppercase leading-none text-[#274ac2]">
        Ready to enroll your child?
      </span>
    </div>
  );
}

// Two identical halves; animating the track to -50% loops seamlessly.
function Half({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="flex">
      {[0, 1, 2].map((i) => (
        <Unit key={i} hidden={hidden} />
      ))}
    </div>
  );
}

export default function MarqueeCTA() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Infinite scroll — only when the user hasn't asked to reduce motion.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(track.current, {
          xPercent: -50,
          duration: 150,
          ease: "none",
          repeat: -1,
        });
      });

      // Reduced motion — hold the track still at its start position.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(track.current, { xPercent: 0 });
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="my-[60px] overflow-hidden">
      <div ref={track} className="flex w-max items-center">
        <Half />
        <Half hidden />
      </div>
    </section>
  );
}
