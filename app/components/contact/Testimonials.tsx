"use client";

import { useRef } from "react";
import { FaStar, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useGSAP } from "@/lib/gsap";
import { Eyebrow } from "../ui";

const REVIEWS = [
  {
    quote:
      "Spring Citadel has been nothing short of a blessing for our family. My son used to dread school, but now he can't wait to get there. The teachers genuinely care and it shows in his confidence.",
    name: "Mrs. Blessing Okafor",
  },
  {
    quote:
      "What stood out to me during our school tour was how happy the students looked. A year in, and I understand why. The environment is structured yet warm, and the communication between school and home is excellent.",
    name: "Mr. Taiwo Adeyemi",
  },
  {
    quote:
      "My daughter is thriving academically and socially. The balance of strong teaching and character development is exactly what we hoped to find for her.",
    name: "Mrs. Amaka Nwosu",
  },
];

function Stars() {
  return (
    <div className="flex gap-1 text-[#f5a623]" aria-label="5 star rating">
      {[0, 1, 2, 3, 4].map((i) => (
        <FaStar key={i} size={18} aria-hidden="true" />
      ))}
    </div>
  );
}

function ArrowBtn({ dir }: { dir: "prev" | "next" }) {
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "Previous" : "Next"}
      className="flex h-11 w-11 items-center justify-center border border-black/20 transition-colors hover:bg-black/5"
    >
      {dir === "prev" ? (
        <FaChevronLeft size={16} aria-hidden="true" />
      ) : (
        <FaChevronRight size={16} aria-hidden="true" />
      )}
    </button>
  );
}

export default function Testimonials() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-[120px]">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-center justify-between gap-6">
          <Eyebrow>Testimonials</Eyebrow>
          <div className="flex gap-3">
            <ArrowBtn dir="prev" />
            <ArrowBtn dir="next" />
          </div>
        </div>

        <div className="mt-10 flex gap-6 overflow-x-auto pb-4">
          {REVIEWS.map((r) => (
            <article
              key={r.name}
              className="w-[380px] shrink-0 border border-black/15 p-8"
            >
              <Stars />
              <p className="mt-5 text-[17px] leading-relaxed opacity-80">
                {r.quote}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-11 w-11 rounded-full bg-[#d9d9d9]"
                />
                <span className="text-[16px] font-medium">{r.name}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
