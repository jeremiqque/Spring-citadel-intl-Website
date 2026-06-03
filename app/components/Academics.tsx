"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { Eyebrow, PillButton, Placeholder } from "./ui";
import Reveal from "./Reveal";

export default function Academics() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section
      ref={root}
      id="academics"
      className="side-pad mt-[120px] bg-[#274ac2] py-[100px] text-white"
    >
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-2 lg:gap-24">
        <Reveal
          feature
          className="order-2 h-[420px] w-full overflow-hidden rounded-[28px] lg:order-1 lg:h-[520px]"
        >
          <Placeholder
            label="Academics Image"
            blend={false}
            className="h-full w-full bg-white/10 text-white/70"
          />
        </Reveal>

        <div className="order-1 lg:order-2">
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
