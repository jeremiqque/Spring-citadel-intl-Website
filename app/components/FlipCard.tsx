"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 3D flip card. Flips on hover (desktop) and on click/tap (touch-friendly).
 * The outer wrapper keeps any tilt rotation passed via `style`; the inner
 * face does the rotateY flip so the two don't fight.
 */
export default function FlipCard({
  front,
  back,
  backImages,
  className = "",
  style,
}: {
  front?: React.ReactNode;
  back?: React.ReactNode;
  backImages?: string[];
  className?: string;
  style?: React.CSSProperties;
}) {
  const [flipped, setFlipped] = useState(false);
  const [backSrc, setBackSrc] = useState(() => backImages?.[0]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleFlip = () => {
    setFlipped((v) => {
      const next = !v;
      // Pick a new random image from the set each time we flip to the back.
      if (next && backImages && backImages.length) {
        setBackSrc(backImages[Math.floor(Math.random() * backImages.length)]);
        // Auto-flip back to the original state after a short pause.
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setFlipped(false), 2000);
      }
      return next;
    });
  };

  return (
    <button
      type="button"
      aria-pressed={flipped}
      aria-label="Flip photo"
      onClick={handleFlip}
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
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#274ac2] text-center text-[14px] font-medium leading-tight text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back ??
            (backSrc ? (
              <img
                src={`/${encodeURIComponent(backSrc)}`}
                alt="Life at Spring Citadel"
                className="img-luminosity h-full w-full object-cover"
              />
            ) : (
              "Spring Citadel"
            ))}
        </div>
      </div>
