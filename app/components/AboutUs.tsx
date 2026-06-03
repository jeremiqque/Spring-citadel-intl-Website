"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { Eyebrow, PillButton, Placeholder } from "./ui";

export default function AboutUs() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} id="about-us" className="side-pad mt-[120px]">
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-2 lg:gap-24">
        <div>
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

        <Placeholder
          label="About Image"
          className="h-[420px] w-full rounded-[28px] lg:h-[520px]"
        />
      </div>
    </section>
  );
}
