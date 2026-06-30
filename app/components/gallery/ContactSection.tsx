"use client";

import { useRef } from "react";
import { FaLocationDot, FaPhone, FaEnvelope, FaRegClock } from "react-icons/fa6";
import { useGSAP } from "@/lib/gsap";
import { Field, PixelMotif } from "../ui";

function InfoRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center bg-[#274ac2] text-white">
        {icon}
      </span>
      <div className="text-[16px] leading-relaxed opacity-80">{children}</div>
    </div>
  );
}

const ICON = {
  pin: <FaLocationDot size={16} aria-hidden="true" />,
  phone: <FaPhone size={16} aria-hidden="true" />,
  mail: <FaEnvelope size={16} aria-hidden="true" />,
  clock: <FaRegClock size={16} aria-hidden="true" />,
};

export default function ContactSection({
  subtitle,
}: {
  subtitle?: string;
}) {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {}, { scope: root });

  return (
    <section ref={root} className="side-pad mt-20 sm:mt-[120px]">
      <div className="relative mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-2 lg:gap-20">
        <PixelMotif className="absolute -top-12 right-0 hidden lg:block" />

        {/* Left: heading + contact details */}
        <div>
          <h2 className="max-w-[24ch] text-[32px] font-medium leading-[1.1] sm:text-[46px]">
            Have questions about us? Let&apos;s talk today!
          </h2>
          {subtitle && (
            <p className="mt-4 max-w-[50ch] text-[18px] leading-relaxed opacity-80">
              {subtitle}
            </p>
          )}
          <hr className="my-8 border-black/15" />
          <div className="space-y-6">
            <InfoRow icon={ICON.pin}>
              NTD 153B Tudun Wada, Tunga, Along Tunga Market Tarred Road, Minna,
              Niger State
            </InfoRow>
            <InfoRow icon={ICON.phone}>0909 464 6737</InfoRow>
            <InfoRow icon={ICON.mail}>springcitadelintschool@gmail.com</InfoRow>
            <InfoRow icon={ICON.clock}>
              Mon–Fri 7:30am – 5:00pm
              <br />
              Sat 9:00am – 1:00pm
            </InfoRow>
          </div>
        </div>

        {/* Right: contact form */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="bg-[#f5f6fa] p-8 sm:p-10"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="First name" required placeholder="First name" />
            <Field label="Last name" placeholder="Last name" />
            <Field label="Email" type="email" placeholder="you@email.com" />
            <Field label="Phone number" type="tel" placeholder="+234 ..." />
          </div>
          <div className="mt-5">
            <Field label="Message" required textarea placeholder="How can we help?" />
          </div>
          <button
            type="submit"
            className="group mt-6 w-full bg-[#274ac2] py-4 text-[18px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <span className="relative block overflow-hidden">
              <span className="block transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-full">
                Submit
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-0 block translate-y-full transition-transform duration-300 ease-out motion-safe:group-hover:translate-y-0"
              >
                Submit
              </span>
            </span>
          </button>
        </form>
      </div>
    </section>
  );
}
