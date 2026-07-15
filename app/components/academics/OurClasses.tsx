"use client";

import { useRef } from "react";
import { PixelMotif } from "../ui";
import Reveal from "../Reveal";
import Image from "next/image";
import { useBatchReveal } from "../scroll-hooks";

const CLASSES = [
  { title: "Early Years", sub: "(Pre-Nursery & Nursery 1–3)", img: "nur 1-3.jpg" },
  { title: "Primary School", sub: "(Primary 1–6)", img: "pry1-pry6.jpg" },
  { title: "Junior Secondary School", sub: "(JSS 1–3)" },
  { title: "Senior Secondary School", sub: "(SS 1–3)", img: "ss1 -ss3.jpg" },
];

function ClassCard({
  title,
  sub,
  img,
}: {
  title: string;
  sub: string;
  img?: string;
}) {
  return (
    <div
      data-card
      className="transition-transform duration-300 ease-out hover:-translate-y-1.5"
    >
      <Reveal feature className="aspect-[7/5] w-full overflow-hidden">
        {img ? (
          <Image
            src={`/${encodeURIComponent(img)}`}
            alt={`${title} ${sub}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div
            role="img"
            aria-label={`${title} ${sub}`}
            className="h-full w-full bg-[#274ac2]"
          />
        )}
      </Reveal>
      <h3 className="mt-5 text-[20px] font-medium leading-snug text-[#274ac2]">
        {title}
        <br />
        {sub}
      </h3>
    </div>
  );
}

export default function OurClasses() {
  const root = useRef<HTMLElement>(null);
  useBatchReveal(root, "[data-card]");

  return (
    <section ref={root} className="side-pad mt-20 sm:mt-[120px]">
      <div className="relative mx-auto max-w-[1320px]">
        <PixelMotif className="absolute right-0 top-0 hidden sm:block" />

        <h2 className="text-center text-[32px] font-medium leading-[1.1] text