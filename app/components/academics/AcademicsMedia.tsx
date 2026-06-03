"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";

// Empty outlined image placeholders, matching the Figma.
function OutlineBox({ className = "" }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Image placeholder"
      className={`border border-black/25 bg-white ${className}`}
    />
  );
}

export default function AcademicsMedia() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-16">
      <div className="mx-auto max-w-[1320px]">
        <OutlineBox className="h-[200px] w-full sm:h-[220px]" />

        <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2">
          <OutlineBox className="h-[180px] w-full" />
          <OutlineBox className="h-[180px] w-full" />
        </div>
      </div>
    </section>
  );
}
