"use client";

import { useRef } from "react";
import { FaStar } from "react-icons/fa6";
import { LuArrowRightToLine } from "react-icons/lu";
import { gsap, useGSAP } from "@/lib/gsap";

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

function Card({ quote, name }: { quote: string; name: string }) {
  return (
    <article className="mr-6 flex w-[85vw] max-w-[520px] shrink-0 flex-col justify-between border border-black/15 p-8 sm:w-[520px] sm:p-10">
      <div>
        <Stars />
        <p className="mt-6 text-[17px] leading-relaxed opacity-80 sm:text-[18px]">
          {quote}
        </p>
      </div>
      <div className="mt-8 flex items-center gap-3">
        <span aria-hidden="true" className="h-12 w-12 rounded-full bg-[#d9d9d9]" />
        <span className="text-[16px] font-medium">{name}</span>
      </div>
    </article>
  );
}

// One half of the marquee track; the track holds two identical halves so
// animating to -50% loops seamlessly (same trick as the enrol marquee).
function Half({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="flex" aria-hidden={hidden || undefined}>
      {REVIEWS.map((r) => (
        <Card key={r.name} quote={r.quote} name={r.name} />
      ))}
    </div>
  );
}

export default function Testimonials() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tween = gsap.to(track.current, {
          xPercent: -50,
          duration: 70,
          ease: "none",
          repeat: -1,
        });

        // Pause while reading (hover / touch), resume on leave.
        const el = track.current!;
        const pause = () => tween.pause();
        const play = () => tween.play();
        el.addEventListener("pointerenter", pause);
        el.addEventListener("pointerleave", play);
        return () => {
          el.removeEventListener("pointerenter", pause);
          el.removeEventListener("pointerleave", play);
        };
      });
      // Reduced motion: no auto-scroll; the strip stays manually scrollable
      // via the motion-reduce class on the container below.
    },
    { scope: root }
  );

  return (
    <section ref={root} className="mt-20 sm:mt-[120px]">
      <div className="side-pad">
        <div className="mx-auto max-w-[1320px]">
          <span className="inline-flex items-center gap-2 text-[16px]">
            Testimonials
            <LuArrowRightToLine size={18} color="#274ac2" aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* Full-bleed marquee strip */}
      <div className="mt-10 overflow-hidden motion-reduce:overflow-x-auto">
        <div ref={track} className="flex w-max">
          <Half />
          <Half hidden />
        </div>
      </div>
    </section>
  );
}
