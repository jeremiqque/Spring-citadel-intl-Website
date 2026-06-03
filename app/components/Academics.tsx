"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Eyebrow, PillButton, Placeholder } from "./ui";
import Reveal from "./Reveal";

export default function Academics() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Desktop: text fades up, image slides in from the left (outer edge).
      mm.add("(min-width: 641px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-col-text]", {
          y: 30,
          autoAlpha: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 75%" },
        });
        gsap.from("[data-col-img]", {
          x: -60,
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
    <section
      ref={root}
      id="academics"
      className="side-pad mt-[120px] bg-[#274ac2] py-[100px] text-white"
    >
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-2 lg:gap-24">
        <Reveal
          feature
          data-col-img
          className="order-2 h-[420px] w-full overflow-hidden rounded-[28px] lg:order-1 lg:h-[520px]"
        >
          <Placeholder
            label="Academics Image"
            blend={false}
            className="h-full w-full bg-white/10 text-white/70"
          />
        </Reveal>

        <div data-col-text className="order-1 lg:order-2">
          <Eyebrow className="opacity-80">Our Academics</Eyebrow>
          <h2 className="mt-4 max-w-[16ch] text-[28px] font-medium leading-[1.1] sm:text-[38px]">
            Quality Education for Every Stage
          </h2>
          <p className="mt-6 max-w-[55ch] text-[18px] leading-relaxed opacity-90">
            From early years through secondary school, our programs are designed
            to build strong foundations, critical thinking and a genuine love of
            learning at every stage of a child&apos;s journey.
          </p>
          <div className="mt-8">
            <PillButton tone="white" arrow>
              Explore Our Academics
            </PillButton>
          </div>
        </div>
      </div>
    </section>
  );
}
