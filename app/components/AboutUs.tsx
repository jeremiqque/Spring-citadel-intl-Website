"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Eyebrow, PillButton, Placeholder } from "./ui";
import Reveal from "./Reveal";

export default function AboutUs() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Desktop: text fades up, image slides in from the right (outer edge).
      mm.add("(min-width: 641px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-col-text]", {
          y: 30,
          autoAlpha: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 75%" },
        });
        gsap.from("[data-col-img]", {
          x: 60,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 75%" },
        });
      });

      // Mobile: both simply fade up.
      mm.add("(max-width: 640px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.from(["[data-col-text]", "[data-col-img]"], {
          y: 20,
          autoAlpha: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 80%" },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(["[data-col-text]", "[data-col-img]"], { autoAlpha: 1, x: 0, y: 0 });
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} id="about-us" className="side-pad mt-[120px]">
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-2 lg:gap-24">
        <div data-col-text>
          <Eyebrow>About us</Eyebrow>
          <h2 className="mt-4 max-w-[24ch] text-[28px] font-medium leading-[1.1] sm:text-[38px]">
            Raising Confident and Responsible Students
          </h2>
          <p className="mt-6 max-w-[55ch] text-[18px] leading-relaxed opacity-80">
            Since 2008, Spring Citadel has grown into one of the region&apos;s
            most trusted schools. We combine a rigorous curriculum with genuine
            care for every learner.
          </p>
          <p className="mt-4 max-w-[55ch] text-[18px] leading-relaxed opacity-80">
            Our teachers know each student by name, nurturing their strengths
            and guiding them through challenges with patience and purpose.
          </p>
          <div className="mt-8">
            <PillButton tone="solid-blue" arrow href="/about">
              Learn More About Us
            </PillButton>
          </div>
        </div>

        <Reveal
          feature
          data-col-img
          className="h-[420px] w-full overflow-hidden rounded-[28px] lg:h-[520px]"
        >
          <Placeholder
            label="About Image"
            blend={false}
            className="h-full w-full"
          />
        </Reveal>
      </div>
    </section>
  );
}
