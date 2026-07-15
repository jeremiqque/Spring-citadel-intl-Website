"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { Eyebrow, PillButton } from "./ui";
import Reveal from "./Reveal";
import FlipCard from "./FlipCard";
import Image from "next/image";

const FLIP_SET = [
  "scis 33.jpg",
  "scis 34.jpg",
  "scis 35.jpg",
  "scis 37.jpg",
  "scis 31.jpg",
  "scis 28.jpg",
];

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
          {["scis 23.jpg", "scis 12.jpg", "scis 16.jpg"].map((src, i) => (
            <Reveal
              key={i}
              feature
              className="aspect-[351/324] w-full overflow-hidden"
            >
              <Image
                src={`/${encodeURIComponent(src)}`}
                alt="Life at Spring Citadel"
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover"
              />
            </Reveal>
          ))}
        </div>

        {/* Tilted / scattered row — flip on hover or tap */}
        <div className="mt-24 flex flex-wrap items-center justify-center gap-3 sm:mt-[200px]">
          {[
            { rot: -8, src: "scis 33.jpg" },
            { rot: 7, src: "scis 34.jpg" },
            { rot: -8, src: "scis 35.jpg" },
            { rot: 7, src: "scis 37.jpg" },
            { rot: -8, src: "scis 31.jpg" },
            { rot: 7, src: "scis 28.jpg" },
          ].map(({ rot, src }, i) => (
            <FlipCard
              key={i}
              className="h-[180px] w-[130px] shrink-0 sm:h-[220px] sm:w-[170px]"
              style={{ transform: `rotate(${rot}deg)` }}
              backImages={FLIP_SET}
              front={
                <Image
                  src={`/${encodeURIComponent(src)}`}
                  alt="Life at Spring Citadel"
                  fill
                  sizes="170px"
                  className="img-luminosity object-cover"
                />
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
