"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { Eyebrow, PillButton } from "./ui";
import Reveal from "./Reveal";
import FlipCard from "./FlipCard";

export default function Gallery() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} id="gallery" className="side-pad mt-20 sm:mt-[120px]">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <Eyebrow>Gallery</Eyebrow>
            <h2 className="mt-4 max-w-[16ch] text-[28px] font-medium leading-[1.1] sm:text-[38px]">
              Life at Spring Citadel
            </h2>
            <p className="mt-5 max-w-[50ch] text-[18px] leading-relaxed opacity-80">
              A glimpse into everyday moments — classrooms, sports, the arts and
              the friendships that shape our students.
            </p>
          </div>
          <PillButton tone="solid-blue" arrow swap href="/gallery">
            View Our Gallery
          </PillButton>
        </div>

        {/* Row of equal tiles — feature photos warm to colour on reveal */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Reveal
              key={i}
              feature
              className="aspect-[351/324] w-full overflow-hidden"
            >
              <div
                role="img"
                aria-label="Gallery photo"
                className="h-full w-full bg-[#d9d9d9]"
              />
            </Reveal>
          ))}
        </div>

        {/* Tilted / scattered row — flip on hover or tap */}
        <div className="mt-24 flex flex-wrap items-center justify-center gap-3 sm:mt-[200px]">
          {[-8, 7, -8, 7, -8, 7].map((rot, i) => (
            <FlipCard
              key={i}
              className="h-[180px] w-[130px] shrink-0 sm:h-[220px] sm:w-[170px]"
              style={{ transform: `rotate(${rot}deg)` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
