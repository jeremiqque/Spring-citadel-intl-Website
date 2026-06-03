"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { Eyebrow, Placeholder } from "./ui";

const CARDS = [
  "Qualified & Caring Teachers",
  "Strong Academic Foundation",
  "Safe Learning Environment",
  "Character & Moral Training",
  "Creativity & Talent Development",
];

export default function WhyChooseUs() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-[120px]">
      <div className="mx-auto max-w-[1320px]">
        <div className="text-center">
          <Eyebrow>Why Choose Us</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-[18ch] text-[38px] font-medium leading-[1.1]">
            An Education Beyond the Classroom
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
          {CARDS.map((c) => (
            <div
              key={c}
              className="relative h-[340px] overflow-hidden"
            >
              <Placeholder label="" className="absolute inset-0 h-full w-full" />
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
