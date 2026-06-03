"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { PillButton, PixelMotif } from "../ui";
import Reveal from "../Reveal";

const CLASSES = [
  { title: "Early Years", sub: "(Pre-Nursery & Nursery 1–3)" },
  { title: "Primary School", sub: "(Primary 1–6)" },
  { title: "Junior Secondary School", sub: "(JSS 1–3)" },
  { title: "Senior Secondary School", sub: "(SS 1–3)" },
];

function ClassCard({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <Reveal feature className="aspect-[4/5] w-full overflow-hidden">
        <div
          role="img"
          aria-label={`${title} ${sub}`}
          className="h-full w-full bg-[#274ac2]"
        />
      </Reveal>
      <h3 className="mt-5 text-[20px] font-medium leading-snug text-[#274ac2]">
        {title}
        <br />
        {sub}
      </h3>
      <div className="mt-5">
        <PillButton tone="solid-blue" arrow href="/#contact-us">
          Contact us
        </PillButton>
      </div>
    </div>
  );
}

export default function OurClasses() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-[120px]">
      <div className="relative mx-auto max-w-[1320px]">
        <PixelMotif className="absolute right-0 top-0 hidden sm:block" />

        <h2 className="text-center text-[32px] font-medium leading-[1.1] text-[#274ac2] sm:text-[46px]">
          Our Classes
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {CLASSES.map((c) => (
            <ClassCard key={c.title} title={c.title} sub={c.sub} />
          ))}
        </div>
      </div>
    </section>
  );
}
