"use client";

import { useRef } from "react";
import { FaArrowRightLong } from "react-icons/fa6";
import { useGSAP } from "@/lib/gsap";

const MAPS_URL =
  "https://www.google.com/maps/place/Spring+Citadel+International+School/@9.6019505,6.560392,17z/data=!3m1!4b1!4m6!3m5!1s0x104c719fe6ae115d:0x4a314967a9b98d4!8m2!3d9.6019505!4d6.5629723!16s%2Fg%2F11t0pjk2fh";

const EMBED_URL =
  "https://maps.google.com/maps?q=9.6019505,6.5629723&z=15&output=embed";

export default function MapSection() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-20 sm:mt-[120px]">
      <div className="relative mx-auto max-w-[1320px]">
        <iframe
          src={EMBED_URL}
          title="Spring Citadel International School location"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-[520px] w-full border-0"
        />

        {/* Overlay info card, bottom-left of the map */}
        <div className="w-full bg-[#274ac2] p-8 text-white sm:absolute sm:bottom-0 sm:left-0 sm:max-w-[400px] sm:p-10">
          <h2 className="text-[28px] font-bold uppercase tracking-wide">
            Find Us
          </h2>
          <p className="mt-5 max-w-[32ch] text-[16px] leading-relaxed opacity-90">
            NTD 153B Tudun Wada, Tunga, Along Tunga Market Tarred Road, Minna,
            Niger State
          </p>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium uppercase tracking-wide transition-opacity hover:opacity-80"
          >
            Get Directions
            <FaArrowRightLong className="rotate-45" size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
