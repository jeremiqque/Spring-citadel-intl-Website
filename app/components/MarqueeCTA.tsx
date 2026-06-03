"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";

// One repeating unit: CTA button + headline phrase.
function Unit({ hidden = false }: { hidden?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center gap-10 pr-10"
      aria-hidden={hidden || undefined}
    >
      <Link
        href="/contact"
        className="shrink-0 bg-[#274ac2] px-7 py-4 text-[16px] font-medium uppercase tracking-wide text-white transition-opacity hover:opacity-90"
      >
        Get in touch today
      </Link>
      <span className="shrink-0 text-[clamp(40px,6vw,72px)] font-bold uppercase leading-none text-[#274ac2]">
        Ready to enroll your child?
      </span>
    </div>
  );
}

// Two identical halves; animating the track to -50% loops seamlessly.
function Half({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="flex">
      {[0, 1, 2].map((i) => (
        <Unit key={i} hidden={hidden} />
      ))}
    </div>
  );
}

export default function MarqueeCTA() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.to(track.current, {
        xPercent: -50,
        duration: 150,
        ease: "none",
        repeat: -1,
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="my-[60px] overflow-hidden">
      <div ref={track} className="flex w-max items-center">
        <Half />
        <Half hidden />
      </div>
    </section>
  );
}
