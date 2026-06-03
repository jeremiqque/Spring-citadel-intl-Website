"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { PillButton } from "./ui";

export default function ClosingCTA() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-[120px]">
      <div className="mx-auto max-w-[900px] text-center">
        <h2 className="mx-auto max-w-[18ch] text-[24px] font-medium leading-[1.1]">
          Give Your Child the Right Foundation
        </h2>
        <p className="mx-auto mt-6 max-w-[55ch] text-[18px] leading-relaxed opacity-80">
          Admissions are open. Join a community committed to academic excellence
          and strong character. We&apos;d love to welcome your family.
        </p>
        <div className="mt-10">
          <PillButton tone="solid-blue" arrow className="!px-7 !py-4">
            Apply for Admission
          </PillButton>
        </div>
      </div>
    </section>
  );
}
