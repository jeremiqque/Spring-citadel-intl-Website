"use client";

import { useRef } from "react";
import { FaArrowRightLong } from "react-icons/fa6";
import { useGSAP } from "@/lib/gsap";

export default function AboutHeader() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad pt-[80px]">
      <div className="mx-auto max-w-[1320px]">
        <span className="inline-flex items-center gap-2 text-[14px] uppercase tracking-[0.18em] opacity-70">
          About us
          <FaArrowRightLong size={16} aria-hidden="true" />
        </span>

        <h1 className="mt-6 max-w-[16ch] text-[44px] font-medium leading-[1.05] sm:text-[60px]">
          Who we are and what drives us
        </h1>

        <div className="mt-8 max-w-[70ch] space-y-6">
          <p className="text-[18px] leading-relaxed opacity-80">
            From early childhood through secondary school, Spring Citadel has
            built a reputation for nurturing well-rounded students. We blend
            academic rigour with genuine care, helping every learner grow in
            confidence and character.
          </p>
          <p className="text-[18px] leading-relaxed opacity-80">
            Our community of dedicated teachers, supportive families and curious
            students shares one belief: that great education shapes not just
            careers, but the people who lead them.
          </p>
        </div>
      </div>
    </section>
  );
}
