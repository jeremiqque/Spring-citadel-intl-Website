"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";

export default function Stakeholders() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-20 sm:mt-[120px]">
      <div className="mx-auto max-w-[1320px]">
        <h2 className="text-center text-[24px] font-medium">
          Meet Our Stakeholders
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              role="img"
              aria-label="Stakeholder photo"
              className="aspect-square w-full border border-[#274ac2]/40 bg-white"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
