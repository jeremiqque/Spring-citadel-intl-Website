"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { Placeholder } from "./ui";

export default function HeroImage() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-[80px]">
      <Placeholder
        label="School Building Illustration"
        className="h-[420px] w-full sm:h-[560px]"
      />
    </section>
  );
}
