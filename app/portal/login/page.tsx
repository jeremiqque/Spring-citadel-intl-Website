"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  IdentityCardIcon,
  LockPasswordIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "./actions";
import { LoginArt } from "./login-art";

// One field, three possible shapes (see auth.ts's identifyCredential):
//   "n.okafor@example.test"     -> email        (admin accounts only, see auth.ts)
//   "SCIS/2026/001"             -> Staff ID      (admin / teacher)
//   "SCIS/2026/JSS3/001"        -> Admission No. (student)
// Client-side validation only checks "something was typed" — the real shape
// dispatch happens server-side in auth.ts, which is the actual boundary.
const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your Admission No., Staff ID, or email"),
  password: z.string().min(1, "Enter your password"),
});
type LoginValues = z.infer<typeof loginSchema>;

const AEONIK = { fontFamily: "var(--font-aeonik), ui-sans-serif, system-ui, sans-serif" };

// Only what the icon requires. Height, radius and type size now come from
// Input's `auth` size (components/ui/input.tsx) instead of an undeclared
// ramp of hexes: this page previously hard-coded #e2e6ee, #fbfcfe and a
// 14.5px type size, all of which duplicated --input, --background and the
// type scale to within a hair. The focus ring comes from
// `.portal :focus-visible` in globals.css — the old focus-visible:ring
// here was #274ac2 at 15% alpha, roughly 1.1:1, no more visible than the
// token ring it was written to replace.
const FIELD_CLASS = "pl-[42px] shadow-none";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (values: LoginValues) => {
    setFormError(null);
    startTransition(async () => {
      const result = await signInAction(values);
      if (result?.error) setFormError(result.error);
    });
  };

  return (
    // .portal activates the scoped shadcn tokens Button/Input/Label rely on
    // (see the .portal block in app/globals.css) — this page renders outside
    // app/portal/(app)/layout.tsx, so it applies the class directly.
    <div className="portal flex min-h-svh items-center justify-center bg-[#e9ebf0] p-3 sm:p-8">
      <div className="grid w-full max-w-[1280px] overflow-hidden rounded-[28px] bg-white shadow-[0_1px_2px_rgba(13,18,32,.04),0_24px_60px_-20px_rgba(13,18,32,.18)] lg:min-h-[min(760px,calc(100svh-4rem))] lg:grid-cols-2">
        {/* ─────────────── Form ─────────────── */}
        <section
          // Below lg there is no illustration panel, so the form is the whole
          // screen: the crest, heading and footer centre on the column rather
          // than hugging a left edge that no longer has anything beside it.
          // Labels and fields stay left-aligned at every width — centred form
          // labels are hard to scan and make error messages jump around.
          className="flex flex-col items-center px-5 py-8 text-center sm:px-16 sm:py-14 lg:items-stretch lg:text-left"
          // .portal's base rule sets font-sans to Inter (for grade-table
          // numerals elsewhere in the portal), but the login screen is a brand
          // surface and stays on Aeonik like the marketing site. Inline style
          // wins the cascade, so a later utility class can't silently undo it.
          style={AEONIK}
        >
          <div className="flex items-center gap-3 text-left lg:mb-auto">
            <Image
              src="/crest.png"
              alt="Spring Citadel International School crest"
              width={42}
              height={42}
              className="h-[42px] w-[42px] object-contain"
              priority
            />
            <div className="leading-tight">
              <p className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">Spring Citadel</p>
              <p className="text-[13px] text-muted-foreground">International School</p>
            </div>
          </div>

          <div className="mx-auto my-10 w-full max-w-[400px] lg:my-12">
            <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-foreground sm:text-[34px]">
              Welcome back
            </h1>
            <p className="mt-2.5 mb-8 text-[15px] text-muted-foreground">Sign in to the school portal.</p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="text-left">
              <div className="mb-5">
                <Label htmlFor="identifier" className="mb-[7px] text-[13px] text-foreground">
                  Admission No. / Staff ID / Email
                </Label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-[14px] text-muted-foreground">
                    <HugeiconsIcon icon={IdentityCardIcon} size={18} />
                  </span>
                  <Input
                    id="identifier"
                    autoComplete="username"
                    // Phones capitalise the first letter and "correct" the
                    // slashes in an admission number. auth.ts now upper-cases
                    // the ID anyway, but there is no reason to let the
                    // keyboard fight the user in the first place.
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="SCIS/2026/JSS3/001"
                    size="auth"
                    className={FIELD_CLASS}
                    aria-invalid={!!errors.identifier}
                    {...register("identifier")}
                  />
                </div>
                {errors.identifier && (
                  <p className="mt-1.5 text-[13px] text-destructive">{errors.identifier.message}</p>
                )}
              </div>

              <div className="mb-5">
                <Label htmlFor="password" className="mb-[7px] text-[13px] text-foreground">
                  Password
                </Label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-[14px] text-muted-foreground">
                    <HugeiconsIcon icon={LockPasswordIcon} size={18} />
                  </span>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    size="auth"
                    className={`${FIELD_CLASS} pr-12`}
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <HugeiconsIcon icon={showPassword ? ViewOffSlashIcon : ViewIcon} size={19} />
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-1.5 text-[13px] text-destructive">{errors.password.message}</p>
                ) : (
                  // Not a link: self-serve reset was dropped on purpose (see the
                  // note on User.mustChangePassword) in favour of admin-issued
                  // temporary passwords. This answers the question without
                  // promising a flow that doesn't exist.
                  <p className="mt-[9px] text-[12.5px] text-muted-foreground">
                    Forgotten your password? The school office can issue a new one.
                  </p>
                )}
              </div>

              {formError && (
                <p role="alert" className="mb-4 text-[13.5px] text-destructive">
                  {formError}
                </p>
              )}

              {/* variant="brand" + size="auth", not a pile of className
                  overrides. The old version set bg-[#274ac2] and
                  hover:bg-[#1f3da6] on variant="default", which paints
                  .btn-glossy as a background-IMAGE — the image covers any
                  background-color underneath, so neither class ever
                  rendered. `loading` replaces the label swap, so the button
                  no longer changes width mid-submit. */}
              <Button
                type="submit"
                variant="brand"
                size="auth"
                loading={isPending}
                className="mt-2"
              >
                {isPending ? "Signing in" : "Sign in"}
              </Button>

              <p className="mt-[22px] text-center text-[13.5px] text-muted-foreground">
                No account? Contact your school administrator.
              </p>
            </form>
          </div>

          <p className="text-xs text-muted-foreground lg:mt-auto">
            © 2026 Spring Citadel International School
          </p>
        </section>

        {/* ─────────────── Illustration ───────────────
            Hidden below lg: on a phone a decorative half-screen only pushes the
            fields below the fold. */}
        <section className="relative hidden flex-col justify-end overflow-hidden bg-[linear-gradient(158deg,#20409f_0%,var(--brand)_46%,#16307f_100%)] lg:flex">
          <LoginArt />
          <div className="relative px-14 pb-14 text-white" style={AEONIK}>
            <span className="mb-3.5 inline-flex items-center gap-2.5 text-[11.5px] uppercase tracking-[0.16em] text-white/70">
              <i className="block h-px w-[22px] bg-white/40" />
              Excellence &amp; Morals
            </span>
            <p className="max-w-[400px] text-[23px] leading-[1.42] tracking-[-0.012em]">
              One portal for results, records and school announcements.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
