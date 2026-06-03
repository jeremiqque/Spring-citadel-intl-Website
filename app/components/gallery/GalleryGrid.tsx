"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { PixelMotif } from "../ui";
import Reveal from "../Reveal";

// Masonry-style spans (col / row) to vary block sizes.
const BLOCKS = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
];

export default function GalleryGrid() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-[100px] mb-[120px]">
      <div className="relative mx-auto max-w-[1320px]">
        <PixelMotif className="absolute -top-10 right-0 hidden sm:block" />

        <div className="grid auto-rows-[180px] grid-cols-2 gap-5 md:grid-cols-4">
          {BLOCKS.map((span, i) => (
            <Reveal key={i} className={`overflow-hidden ${span}`}>
              <div
                role="img"
                aria-label="Gallery photo"
                className="img-luminosity h-full w-full bg-[#274ac2]"
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
