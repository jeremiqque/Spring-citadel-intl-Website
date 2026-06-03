"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Placeholder } from "./ui";

export default function HeroImage() {
  const root = useRef<HTMLElement>(null);
  const art = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Eases in just after the hero text, with a soft scale settle.
        gsap.from(art.current, {
          autoAlpha: 0,
          y: 30,
          scale: 0.96,
          duration: 1,
          ease: "power3.out",
          delay: 0.6,
        });

        // Optional tiny, slow float so the scene feels alive (skip on mobile).
        if (!window.matchMedia("(max-width: 640px)").matches) {
          gsap.to(art.current, {
            y: "-=6",
            duration: 3,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            delay: 1.6,
          });
        }
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(art.current, { autoAlpha: 1, y: 0, scale: 1 });
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="side-pad mt-[80px]">
      <div ref={art}>
        <Placeholder
          label="School Building Illustration"
          className="h-[420px] w-full sm:h-[560px]"
        />
      </div>
    </section>
  );
}
