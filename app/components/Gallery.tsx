"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { Eyebrow, PillButton } from "./ui";

function GalleryTile({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="img"
      aria-label="Gallery photo"
      className={`img-luminosity bg-[#d9d9d9] ${className}`}
      style={style}
    />
  );
}

export default function Gallery() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} id="gallery" className="side-pad mt-[120px]">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <Eyebrow>Gallery</Eyebrow>
            <h2 className="mt-4 max-w-[16ch] text-[38px] font-medium leading-[1.1]">
              Life at Spring Citadel
            </h2>
            <p className="mt-5 max-w-[50ch] text-[18px] leading-relaxed opacity-80">
              A glimpse into everyday moments — classrooms, sports, the arts and
              the friendships that shape our students.
            </p>
          </div>
          <PillButton tone="solid-blue" arrow>
            View Our Gallery
          </PillButton>
        </div>

        {/* Row of equal tiles */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <GalleryTile key={i} className="aspect-[351/324] w-full" />
          ))}
        </div>

        {/* Tilted / scattered row */}
        <div className="mt-[200px] flex items-center justify-center gap-3">
          {[-8, 7, -8, 7, -8, 7].map((rot, i) => (
            <GalleryTile
              key={i}
              className="h-[220px] w-[170px] shrink-0"
              style={{ transform: `rotate(${rot}deg)` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
