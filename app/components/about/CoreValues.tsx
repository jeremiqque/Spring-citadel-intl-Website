"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { Eyebrow } from "../ui";

type Variant = "blue" | "outline" | "navy" | "red";

const VALUES: {
  num: string;
  name: string;
  description: string;
  variant: Variant;
}[] = [
  {
    num: "01",
    name: "Excellence",
    description:
      "We pursue the highest standards in everything we do — academically, athletically, and in character.",
    variant: "blue",
  },
  {
    num: "02",
    name: "Integrity",
    description:
      "Honesty, accountability, and ethical conduct form the foundation of our school culture.",
    variant: "outline",
  },
  {
    num: "03",
    name: "Community",
    description:
      "We believe education thrives when families, teachers, and students work as partners.",
    variant: "navy",
  },
  {
    num: "04",
    name: "Innovation",
    description:
      "We equip students to think creatively, embrace change, and lead in an evolving world.",
    variant: "red",
  },
];

const STYLES: Record<Variant, string> = {
  blue: "bg-[#274ac2] text-white",
  outline: "bg-white text-black border border-black/15",
  navy: "bg-[#14225c] text-white",
  red: "bg-[#e23b3b] text-white",
};

// Numbered chip: square box with contrasting fill per row variant.
const CHIP: Record<Variant, string> = {
  blue: "bg-white text-[#274ac2]",
  outline: "bg-[#274ac2] text-white",
  navy: "bg-white text-[#14225c]",
  red: "bg-white text-[#e23b3b]",
};

function ValueRow({
  num,
  name,
  description,
  variant,
}: {
  num: string;
  name: string;
  description: string;
  variant: Variant;
}) {
  return (
    <div
      className={`grid grid-cols-1 items-center gap-6 p-8 sm:p-10 lg:grid-cols-2 ${STYLES[variant]}`}
    >
      <div className="flex items-center gap-5">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center text-[18px] font-medium ${CHIP[variant]}`}
        >
          {num}
        </span>
        <span className="text-[28px] font-medium sm:text-[38px]">{name}</span>
      </div>
      <p className="text-[18px] leading-relaxed opacity-90">{description}</p>
    </div>
  );
}

export default function CoreValues() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-20 sm:mt-[120px]">
      <div className="mx-auto max-w-[1320px]">
        <div className="text-center">
          <Eyebrow>Our Core Values</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-[18ch] text-[32px] font-medium leading-[1.1] sm:text-[46px]">
            The principles that guide us
          </h2>
        </div>

        <div className="mt-14 overflow-hidden rounded-[24px]">
          {VALUES.map((v) => (
            <ValueRow key={v.num} {...v} />
          ))}
        </div>
      </div>
    </section>
  );
}
