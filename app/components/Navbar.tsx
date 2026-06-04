"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FaBars, FaXmark } from "react-icons/fa6";
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
  const [open, setOpen] = useState(false);

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
              className="group text-[18px] opacity-80 transition-colors hover:text-[#274ac2] hover:opacity-100"
            >
              {/* Text swap: label slides up, blue copy slides in from below */}
              <span className="relative block overflow-hidden">
                <span className="block transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-full">
                  {l.label}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 block translate-y-full text-[#274ac2] transition-transform duration-300 ease-out motion-safe:group-hover:translate-y-0"
                >
                  {l.label}
                </span>
              </span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <PillButton tone="outline-blue" swap className="hidden lg:inline-flex">
            School Portal
          </PillButton>
          <PillButton tone="solid-blue" swap href="/contact" className="hidden lg:inline-flex">
            Enroll Now
          </PillButton>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center border border-black/20 lg:hidden"
          >
            {open ? <FaXmark size={20} /> : <FaBars size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="border-t border-black/10 pb-6 lg:hidden">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-1 pt-2">
            {LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 text-[18px] opacity-80 transition-colors hover:text-[#274ac2] hover:opacity-100"
              >
                {l.label}
              </Link>
            ))}
            <PillButton tone="outline-blue" swap className="mt-3 inline-flex w-full">
              School Portal
            </PillButton>
            <PillButton tone="solid-blue" swap href="/contact" className="mt-2 inline-flex w-full">
              Enroll Now
            </PillButton>
          </div>
        </nav>
      )}
    </header>
  );
}
