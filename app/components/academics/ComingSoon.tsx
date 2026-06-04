"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";

function Flower() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
      <g fill="#274ac2">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <ellipse
            key={deg}
            cx="28"
            cy="14"
            rx="8"
            ry="14"
            transform={`rotate(${deg} 28 28)`}
            opacity="0.85"
          />
        ))}
      </g>
      <circle cx="28" cy="28" r="6" fill="#14225c" />
    </svg>
  );
}

export default function ComingSoon() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-12 sm:mt-[80px]">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-4 text-center">
        <Flower />
        <p className="text-[20px] font-medium text-[#274ac2] sm:text-[28px]">
          Higher institution coming soon……
        </p>
      </div>
    </section>
  );
}
