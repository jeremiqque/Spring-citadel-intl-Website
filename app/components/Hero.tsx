"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { PillButton, Placeholder } from "./ui";

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} id="home" className="side-pad pt-[80px]">
      <div className="mx-auto flex max-w-[1320px] flex-col items-center text-center">
        <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-[14px]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#274ac2]" />
          Est. 2008 · Niger, Nigeria
        </span>

        <h1 className="max-w-[14ch] text-[44px] font-medium leading-[1.05] sm:text-[60px]">
          Welcome to Spring Citadel Int&apos;l School
        </h1>

        <p className="mt-6 max-w-[60ch] text-[18px] leading-relaxed opacity-80">
          A nurturing environment where academic excellence meets strong moral
          character. We raise confident, curious and responsible students ready
          for the world ahead.
        </p>

        <div className="mt-10 flex flex-col items-center gap-8 sm:flex-row sm:gap-10">
          <PillButton tone="solid-blue" arrow className="!px-7 !py-4">
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
