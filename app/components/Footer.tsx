"use client";

import { useRef } from "react";
import Link from "next/link";
import { FaFacebookF, FaInstagram } from "react-icons/fa6";
import { useGSAP } from "@/lib/gsap";

const SOCIALS = [
  { label: "Facebook", Icon: FaFacebookF, href: "https://www.facebook.com/springcitadelschool/" },
  { label: "Instagram", Icon: FaInstagram, href: "https://www.instagram.com/spring_citadel/" },
];

const QUICK: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact us", href: "/contact" },
];

export default function Footer() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <footer
      ref={root}
      id="contact-us"
      className="side-pad bg-[#274ac2] py-12 text-white sm:py-[80px]"
    >
      <div className="mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-3">
        <div>
          <div className="max-w-[260px] text-[20px] font-medium leading-tight">
            Spring Citadel International School
          </div>
          <p className="mt-4 max-w-[30ch] text-[16px] opacity-80">
            Excellence & Morals. 
            Est. 2008, Niger, Nigeria.
          </p>
          <div className="mt-6 flex gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 transition-colors hover:bg-white/10"
              >
                <s.Icon size={18} color="#ffffff" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[18px] font-medium">Quick links</h3>
          <ul className="mt-4 space-y-3 text-[16px] opacity-80">
            {QUICK.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="transition-opacity hover:opacity-100"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[18px] font-medium">Contact</h3>
          <ul className="mt-4 space-y-3 text-[16px] opacity-80">
            <li>NTD 153B Tudun Wada, Tunga, Along Tunga Market Tarred Road, Minna, Niger State</li>
            <li>0909 464 6737</li>
            <li>springcitadelintschool@gmail.com</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[1320px] border-t border-white/20 pt-6 text-[14px] opacity-70">
        © {new Date().getFullYear()} Spring Citadel International School. All
        rights reserved.
      </div>
    </footer>
  );
}
