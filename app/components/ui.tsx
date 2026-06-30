import React from "react";
import Link from "next/link";
import { FaArrowRightLong } from "react-icons/fa6";

type Tone = "ink" | "white" | "solid-blue" | "outline-blue";

export function PillButton({
  children,
  tone = "ink",
  href = "#",
  className = "",
  arrow = false,
  swap = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  href?: string;
  className?: string;
  arrow?: boolean;
  swap?: boolean;
}) {
  const tones: Record<Tone, React.CSSProperties> = {
    ink: { color: "#000", borderColor: "#000", background: "transparent" },
    white: { color: "#fff", borderColor: "#fff", background: "transparent" },
    "solid-blue": {
      color: "#fff",
      borderColor: "#274ac2",
      background: "#274ac2",
    },
    "outline-blue": {
      color: "#000",
      borderColor: "#274ac2",
      background: "#fff",
    },
  };
  const cls = `btn-pill gap-2 font-[var(--font-aeonik)] ${swap ? "group" : ""} ${className}`;
  const inner = (
    <>
      {swap ? (
        // Text swap: label slides up, identical copy slides in from below.
        <span className="relative block overflow-hidden">
          <span className="block transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-full">
            {children}
          </span>
          <span
            aria-hidden="true"
            className="absolute inset-0 block translate-y-full transition-transform duration-300 ease-out motion-safe:group-hover:translate-y-0"
          >
            {children}
          </span>
        </span>
      ) : (
        children
      )}
      {arrow && <FaArrowRightLong size={18} aria-hidden="true" />}
    </>
  );
  // Use client-side routing for internal routes; <a> for hashes / external.
  const isInternal = href.startsWith("/");
  return isInternal ? (
    <Link href={href} className={cls} style={tones[tone]}>
      {inner}
    </Link>
  ) : (
    <a href={href} className={cls} style={tones[tone]}>
      {inner}
    </a>
  );
}

export function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block text-[14px] uppercase tracking-[0.18em] opacity-70 ${className}`}
    >
      {children}
    </span>
  );
}

// Decorative stepped blue pixel-block motif — a clean connected staircase.
// Position with className.
export function PixelMotif({ className = "" }: { className?: string }) {
  // 3 cols x 2 rows; filled cells connect into a descending step block.
  const cells = [1, 1, 0, 0, 1, 1];
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden="true">
      <div className="grid grid-cols-3 grid-rows-2 gap-0">
        {cells.map((on, i) => (
          <span
            key={i}
            className={`h-6 w-6 ${on ? "bg-[#274ac2]" : "bg-transparent"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function Field({
  label,
  type = "text",
  required = false,
  textarea = false,
  placeholder,
}: {
  label: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  placeholder?: string;
}) {
  const base =
    "mt-2 w-full border border-black/20 bg-white px-4 py-3 text-[16px] outline-none focus:border-[#274ac2]";
  return (
    <label className="block">
      <span className="text-[15px] font-medium">
        {label}
        {required && <span className="text-[#e23b3b]"> *</span>}
      </span>
      {textarea ? (
        <textarea
          rows={5}
          required={required}
          placeholder={placeholder}
          className={`${base} resize-none`}
        />
      ) : (
        <input
          type={type}
          required={required}
          placeholder={placeholder}
          className={base}
        />
      )}
    </label>
  );
}

export function Stat({
  value,
  label,
  className = "",
}: {
  value: string;
  label: string;
  className?: string;
}) {
  // Split "98%" / "120+" into prefix, number and suffix for count-up.
  const m = value.match(/^(\D*)([\d.]+)(.*)$/);
  const prefix = m?.[1] ?? "";
  const num = m?.[2] ?? "";
  const suffix = m?.[3] ?? "";
  return (
    <div className={className}>
      <div
        data-count={num}
        data-prefix={prefix || undefined}
        data-suffix={suffix || undefined}
        className="text-[48px] font-medium leading-none sm:text-[60px]"
      >
        {value}
      </div>
      <div className="mt-3 text-[18px] opacity-80">{label}</div>
    </div>
  );
}

export const SCHOOL_STATS = [
  { value: "98%", label: "WAEC Pass Rate" },
  { value: "120+", label: "Teaching Staff" },
  { value: "18+", label: "Years of Excellence" },
];

export function Placeholder({
  label,
  className = "",
  style,
  blend = true,
}: {
  label: string;
  className?: string;
  style?: React.CSSProperties;
  blend?: boolean;
}) {
  return (
    <div
      className={`placeholder ${blend ? "img-luminosity" : ""} ${className}`}
      style={style}
      aria-label={label}
      role="img"
    >
      {label}
    </div>
  );
}
