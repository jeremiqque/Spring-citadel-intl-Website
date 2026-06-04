"use client";

import { useRef } from "react";
import { LuArrowRightToLine } from "react-icons/lu";
import { useGSAP } from "@/lib/gsap";

export default function AcademicsHeader() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad pt-12 sm:pt-[80px]">
      <div className="mx-auto max-w-[1320px]">
        <span className="inline-flex items-center gap-2 text-[16px]">
          Our academics
          <LuArrowRightToLine size={18} color="#274ac2" aria-hidden="true" />
        </span>

        <h1 className="mt-6 text-[44px] font-medium leading-[1.05] sm:text-[60px]">
          Academic Programmes
        </h1>

        <div className="mt-8 max-w-[80ch] space-y-6">
          <p className="text-[18px] leading-relaxed opacity-80">
            From foundational primary education to university-preparatory senior
            secondary, we offer structured programmes at every level. Our
            curriculum is designed to help students build strong knowledge,
            develop practical skills, and gain confidence in their abilities.
          </p>
          <p className="text-[18px] leading-relaxed opacity-80">
            We provide a balanced learning experience that supports every
            student&apos;s growth. Our teachers use effective teaching methods to
            make learning clear, engaging, and meaningful.
          </p>
        </div>
      </div>
    </section>
  );
}
