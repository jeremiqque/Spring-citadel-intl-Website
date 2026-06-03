"use client";

import { useRef } from "react";
import { FaArrowRightLong } from "react-icons/fa6";
import { useGSAP } from "@/lib/gsap";
import { PillButton, PixelMotif } from "../ui";

const PROGRAMMES = [
  "Montessori School",
  "Nursery School",
  "Primary School",
  "Senior Secondary School",
  "BECE/WAEC/NECO Program",
  "Admission Enquiries",
];

export default function ProgrammesBand() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-[120px] bg-[#274ac2] py-[100px] text-white">
      <div className="relative mx-auto max-w-[1320px]">
        <PixelMotif className="absolute -top-6 right-0 hidden sm:block" />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Left: heading + paragraph + button */}
          <div>
            <h2 className="max-w-[14ch] text-[46px] font-medium leading-[1.1]">
              Step by step, we guide your child to excellence
            </h2>
            <p className="mt-6 max-w-[40ch] text-[18px] leading-relaxed opacity-90">
              From their first day to graduation, our programmes are structured
              to nurture every stage of your child&apos;s growth.
            </p>
            <div className="mt-8">
              <PillButton tone="white" arrow>
                Explore our Programmes
              </PillButton>
            </div>
          </div>

          {/* Center: image placeholder */}
          <div
            role="img"
            aria-label="Programmes image"
            className="img-luminosity h-[280px] w-full bg-white lg:h-auto"
          />

          {/* Right: linked list */}
          <ul className="divide-y divide-white/20 border-y border-white/20">
            {PROGRAMMES.map((p) => (
              <li key={p}>
                <a
                  href="/academics"
                  className="flex items-center justify-between gap-4 py-4 text-[18px] transition-opacity hover:opacity-80"
                >
                  {p}
                  <FaArrowRightLong size={18} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
