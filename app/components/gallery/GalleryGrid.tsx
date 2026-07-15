"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { PixelMotif } from "../ui";
import Reveal from "../Reveal";
import Image from "next/image";

// Masonry-style spans (col / row) to vary block sizes.
const BLOCKS = [
  { span: "col-span-2 row-span-2", src: "scis 01.jpg" },
  { span: "col-span-1 row-span-1", src: "scis 07.jpg" },
  { span: "col-span-1 row-span-2", src: "scis 13.jpg" },
  { span: "col-span-1 row-span-1", src: "scis 23.jpg" },
  { span: "col-span-2 row-span-1", src: "scis 21.jpg" },
  { span: "col-span-1 row-span-2", src: "scis 25.jpg" },
  { span: "col-span-1 row-span-1", src: "scis 12.jpg" },
  { span: "col-span-2 row-span-1", src: "scis 16.jpg" },
  { span: "col-span-1 row-span-1", src: "scis 36.jpg" },
];

export default function GalleryGrid() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-16 mb-20 sm:mt-[100px] sm:mb-[120px]">
      <div className="relative mx-auto max-w-[1320px]">
        <PixelMotif className="absolute -top-10 right-0 hidden sm:block" />

        <div className="grid auto-rows-[180px] grid-cols-2 gap-5 md:grid-cols-4">
          {BLOCKS.map(({ span, src }, i) => (
            <Reveal key={i} className={`overflow-hidden ${span}`}>
              <Image
                src={`/${encodeURIComponent(src)}`}
                alt="Gallery photo"
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="img-luminosity object-cover"
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
