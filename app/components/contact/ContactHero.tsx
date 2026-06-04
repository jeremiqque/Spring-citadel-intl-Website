"use client";

import { useRef } from "react";
import { LuArrowRightToLine } from "react-icons/lu";
import { useGSAP } from "@/lib/gsap";

export default function ContactHero() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-6">
      <div className="relative flex min-h-[420px] items-center overflow-hidden bg-[#14225c] sm:min-h-[480px]">
        {/* Large background typography graphic */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center text-[120px] font-bold leading-none text-white/10 sm:text-[200px]"
        >
          CONTACT US
        </span>

        {/* Overlaid content */}
        <div className="side-pad relative w-full text-center text-white">
          <div className="mx-auto max-w-[1320px]">
            <span className="inline-flex items-center gap-2 border border-white/60 px-5 py-3 text-[16px]">
              Contact us
              <LuArrowRightToLine size={18} aria-hidden="true" />
            </span>

            <h1 className="mt-8 text-[44px] font-medium leading-[1.05] sm:text-[60px]">
              Contact Us
            </h1>
            <p className="mx-auto mt-5 max-w-[60ch] text-[18px] leading-relaxed opacity-90">
              We&apos;d love to hear from you whether you&apos;re a prospective
              parent, student, or partner. Get in touch today.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
