"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText } from "@/lib/gsap";
import { PillButton, Placeholder } from "./ui";

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Full motion — only when the user hasn't asked to reduce it.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Smaller travel on phones, a touch more on larger screens.
        const isMobile = window.matchMedia("(max-width: 640px)").matches;
        const rise = isMobile ? 20 : 40;

        const split = new SplitText(heading.current, { type: "lines" });
        // Mask the lines so they rise from behind their own baseline.
        split.lines.forEach((line) => {
          (line as HTMLElement).style.overflow = "hidden";
        });

        const tl = gsap.timeline({
          defaults: { ease: "power3.out", duration: 0.8 },
        });

        tl.from("[data-hero-badge]", { y: rise, autoAlpha: 0, duration: 0.6 })
          .from(
            split.lines,
            { y: rise + 20, autoAlpha: 0, stagger: 0.12 },
            "-=0.2"
          )
          .from("[data-hero-sub]", { y: rise, autoAlpha: 0 }, "-=0.4")
          .from("[data-hero-cta]", { y: rise, autoAlpha: 0 }, "-=0.5");

        return () => split.revert();
      });

      // Reduced motion — everything visible immediately, no movement.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          [
            "[data-hero-badge]",
            "[data-hero-sub]",
            "[data-hero-cta]",
            heading.current,
          ],
          { autoAlpha: 1, y: 0 }
        );
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} id="home" className="side-pad pt-[80px]">
      <div className="mx-auto flex max-w-[1320px] flex-col items-center text-center">
        <span
          data-hero-badge
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-[14px]"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[#274ac2]" />
          Est. 2008 · Niger, Nigeria
        </span>

        <h1
          ref={heading}
          className="max-w-[14ch] text-[44px] font-medium leading-[1.05] sm:text-[60px]"
        >
          Welcome to Spring Citadel Int&apos;l School
        </h1>

        <p
          data-hero-sub
          className="mt-6 max-w-[60ch] text-[18px] leading-relaxed opacity-80">
          A nurturing environment where academic excellence meets strong moral
          character. We raise confident, curious and responsible students ready
          for the world ahead.
        </p>

        <div
          data-hero-cta
          className="mt-10 flex flex-col items-center gap-8 sm:flex-row sm:gap-10"
        >
          <PillButton tone="solid-blue" arrow href="/contact" className="!px-7 !py-4">
            Start Learning Today
          </PillButton>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[0, 1, 2, 3].map((i) => (
                <Placeholder
                  key={i}
                  label=""
                  blend={false}
                  className="h-11 w-11 rounded-full border-2 border-white"
                />
              ))}
            </div>
            <span className="text-[18px] font-medium">
              2400+ Enrolled Students
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
