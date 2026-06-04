"use client";

import { useRef } from "react";
import { Placeholder, Stat, SCHOOL_STATS } from "../ui";
import { useCountUp } from "../scroll-hooks";

export default function AboutHero() {
  const root = useRef<HTMLElement>(null);
  useCountUp(root);

  return (
    <section ref={root} className="side-pad mt-12 sm:mt-[80px]">
      <div className="relative overflow-hidden">
        <Placeholder
          label="School Building Illustration"
          className="h-[420px] w-full sm:h-[560px]"
        />

        {/* Stats: solid band below the image on mobile, overlaid at sm+ */}
        <div className="sm:absolute sm:inset-x-0 sm:bottom-0">
          <div className="bg-[#14225c] px-6 py-10 sm:bg-transparent sm:bg-gradient-to-t sm:from-black/55 sm:to-transparent sm:px-12 sm:pb-10 sm:pt-24">
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
