"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { Placeholder, Stat, SCHOOL_STATS } from "../ui";

export default function AboutHero() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-[80px]">
      <div className="relative overflow-hidden">
        <Placeholder
          label="School Building Illustration"
          className="h-[420px] w-full sm:h-[560px]"
        />

        {/* Stats overlaid on the illustration */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="bg-gradient-to-t from-black/55 to-transparent px-6 pb-10 pt-24 sm:px-12">
            <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-8 text-white sm:grid-cols-3">
              {SCHOOL_STATS.map((s) => (
                <Stat
                  key={s.label}
                  value={s.value}
                  label={s.label}
                  className="text-center"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
