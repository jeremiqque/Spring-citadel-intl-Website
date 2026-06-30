"use client";

import { useRef } from "react";
import { PillButton } from "./ui";
import { useCountUp } from "./scroll-hooks";

const STATS = [
  { num: 98, suffix: "%", value: "98%", label: "WAEC Pass Rate" },
  { num: 120, suffix: "+", value: "120+", label: "Teaching Staff" },
  { num: 18, suffix: "+", value: "18+", label: "Years of Excellence" },
];

export default function MissionBand() {
  const root = useRef<HTMLElement>(null);
  useCountUp(root);

  return (
    <section
      ref={root}
      className="side-pad mt-20 bg-[#274ac2] py-16 text-white sm:mt-[120px] sm:py-[100px]"
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <h2 className="max-w-[24ch] text-[28px] font-medium leading-[1.1] sm:text-[38px]">
            A School Where Learning Meets Character
          </h2>
          <PillButton tone="white" arrow swap href="/about" className="!px-7 !py-4">
            Our Mission &amp; Vision
          </PillButton>
        </div>

        <div className="mt-12 max-w-[640px] space-y-6">
          <p className="text-[18px] leading-relaxed opacity-90">
            At Spring Citadel, we believe education is more than reading and
            writing. It is about building confidence, discipline, creativity,
            leadership, and good character.
          </p>
          <p className="text-[18px] leading-relaxed opacity-90">
            Our teachers are dedicated to helping every student succeed, both
            inside and outside the classroom. With a strong academic program and
            a supportive school community, we prepare students for a bright and
            successful future.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-10 border-t border-white/20 pt-12 sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div
                data-count={s.num}
                data-suffix={s.suffix}
                className="text-[48px] font-medium leading-none sm:text-[60px]"
              >
                {s.value}
              </div>
              <div className="mt-3 text-[18px] opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/crest.png"
            alt="Spring Citadel International School crest"
            className="h-64 w-64 object-contain sm:h-72 sm:w-72"
          />
        </div>
      </div>
    </section>
  );
}
