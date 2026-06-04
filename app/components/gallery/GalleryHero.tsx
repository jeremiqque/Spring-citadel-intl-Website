"use client";

import { useRef } from "react";
import { LuArrowRightToLine } from "react-icons/lu";
import { useGSAP } from "@/lib/gsap";

export default function GalleryHero() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-6">
      <div className="relative overflow-hidden">
        {/* Darkened school illustration background (fills whatever height the content needs) */}
        <div
          role="img"
          aria-label="School illustration"
          className="img-luminosity absolute inset-0 bg-[#d9d9d9]"
        />
        <div className="absolute inset-0 bg-black/55" />

        {/* Content top-left — in normal flow so the hero grows with it */}
        <div className="relative min-h-[420px] sm:min-h-[480px]">
          <div className="side-pad w-full py-12 sm:pt-16">
            <div className="mx-auto max-w-[1320px] text-white">
              <span className="inline-flex items-center gap-2 bg-white px-5 py-3 text-[16px] text-black">
                Our gallery
                <LuArrowRightToLine size={18} color="#274ac2" aria-hidden="true" />
              </span>

              <p className="mt-8 max-w-[60ch] text-[20px] leading-relaxed sm:text-[24px]">
                Explore beautiful moments from Spring Citadel — our classrooms,
                sports, cultural events, student activities and the everyday joy
                of school life.
              </p>
              <p className="mt-4 max-w-[55ch] text-[18px] leading-relaxed opacity-90">
                We believe school life should be exciting, meaningful, and full
                of positive experiences.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
