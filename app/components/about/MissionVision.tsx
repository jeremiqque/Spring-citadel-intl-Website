"use client";

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";

const MISSION_POINTS = [
  "Deliver a balanced curriculum that develops both intellect and character.",
  "Create a safe, inclusive environment where every child feels they belong.",
  "Equip students with the skills and values to lead and serve their community.",
];

function CardIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2 3 7l9 5 9-5-9-5Z" />
      <path d="M3 7v6l9 5 9-5V7" />
    </svg>
  );
}

export default function MissionVision() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-[120px]">
      <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-2">
        {/* Our Mission */}
        <div className="bg-[#274ac2] p-10 text-white sm:p-12">
          <CardIcon />
          <h2 className="mt-8 text-[46px] font-medium leading-[1.1]">
            Our Mission
          </h2>
          <ol className="mt-8 space-y-6">
            {MISSION_POINTS.map((point, i) => (
              <li key={i} className="flex gap-4">
                <span className="text-[20px] font-medium opacity-70">
                  0{i + 1}
                </span>
                <span className="text-[18px] leading-relaxed opacity-90">
                  {point}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Our Vision */}
        <div className="bg-[#14225c] p-10 text-white sm:p-12">
          <CardIcon />
          <h2 className="mt-8 text-[46px] font-medium leading-[1.1]">
            Our Vision
          </h2>
          <p className="mt-8 text-[18px] leading-relaxed opacity-90">
            To be a leading school in Nigeria recognised for academic excellence
            and strong moral grounding — raising a generation of confident,
            compassionate and capable young people who go on to make a positive
            difference in the world around them.
          </p>
        </div>
      </div>
    </section>
  );
}
