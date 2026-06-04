"use client";

import { useRef } from "react";
import { Eyebrow, Placeholder } from "./ui";
import Reveal from "./Reveal";
import { useBatchReveal } from "./scroll-hooks";

const CARDS = [
  "Qualified & Caring Teachers",
  "Strong Academic Foundation",
  "Safe Learning Environment",
  "Character & Moral Training",
  "Creativity & Talent Development",
];

export default function WhyChooseUs() {
  const root = useRef<HTMLElement>(null);
  useBatchReveal(root, "[data-card]");

  return (
    <section ref={root} className="side-pad mt-20 sm:mt-[120px]">
      <div className="mx-auto max-w-[1320px]">
        <div className="text-center">
          <Eyebrow>Why Choose Us</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-[18ch] text-[28px] font-medium leading-[1.1] sm:text-[38px]">
            An Education Beyond the Classroom
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
          {CARDS.map((c) => (
            <div
              key={c}
              data-card
              className="relative h-[260px] overflow-hidden sm:h-[340px]"
            >
              <Reveal feature className="absolute inset-0">
                <Placeholder label="" blend={false} className="h-full w-full" />
              </Reveal>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-5 left-5 right-5 text-[18px] font-medium leading-tight text-white">
                {c}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
