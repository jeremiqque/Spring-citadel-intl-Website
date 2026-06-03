"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@/lib/gsap";
import { PillButton } from "./ui";

const LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact us", href: "/contact" },
];

export default function Navbar() {
  const root = useRef<HTMLElement>(null);

  // GSAP scaffolding only — scoped to this section, no animation yet.
  useGSAP(() => {}, { scope: root });

  return (
    <header
      ref={root}
      className="side-pad sticky top-0 z-50 bg-white/90 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/crest.png"
            alt="Spring Citadel International School crest"
            className="h-12 w-12 shrink-0 object-contain"
          />
          <span className="leading-tight">
            <span className="block text-[20px] font-medium">Spring Citadel</span>
            <span className="block text-[15px] opacity-70">
              International School
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-[18px] opacity-80 transition-opacity hover:opacity-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <PillButton tone="outline-blue" className="hidden sm:inline-flex">
            School Portal
          </PillButton>
          <PillButton tone="solid-blue">Enroll Now</PillButton>
        </div>
      </div>
    </header>
  );
}
