"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { PillButton } from "../ui";

export default function CtaBand() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-[120px] bg-[#274ac2] py-[80px] text-white">
      <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <p className="max-w-[60ch] text-[18px] leading-relaxed sm:text-[20px]">
          Give your child the advantage of quality education in a safe and
          structured environment. Call us today or visit the school for more
          information.
        </p>
        <PillButton tone="white" arrow swap href="/contact" className="shrink-0 !px-7 !py-4">
          Get started today
        </PillButton>
      </div>
    </section>
  );
}
