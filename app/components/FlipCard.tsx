"use client";

import { useState } from "react";

/**
 * 3D flip card. Flips on hover (desktop) and on click/tap (touch-friendly).
 * The outer wrapper keeps any tilt rotation passed via `style`; the inner
 * face does the rotateY flip so the two don't fight.
 */
export default function FlipCard({
  front,
  back,
  className = "",
  style,
}: {
  front?: React.ReactNode;
  back?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={flipped}
      aria-label="Flip photo"
      onClick={() => setFlipped((v) => !v)}
      className={`group [perspective:1000px] ${className}`}
      style={style}
    >
      <div
        className={`relative h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none ${
          flipped
            ? "[transform:rotateY(180deg)]"
            : "group-hover:[transform:rotateY(180deg)]"
        }`}
      >
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden]">
          {front ?? (
            <div
              role="img"
              aria-label="Gallery photo"
              className="img-luminosity h-full w-full bg-[#d9d9d9]"
            />
          )}
        </div>

        {/* Back */}
        <div className="absolute inset-0 flex items-center justify-center bg-[#274ac2] p-3 text-center text-[14px] font-medium leading-tight text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back ?? "Spring Citadel"}
        </div>
      </div>
    </button>
  );
}
