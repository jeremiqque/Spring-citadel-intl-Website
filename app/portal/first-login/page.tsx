"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { firstLoginAction } from "./actions";

const formSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(10, "Must be at least 10 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Choose a password different from your current one",
    path: ["newPassword"],
  });
type FormValues = z.infer<typeof formSchema>;

// Same eye-toggle pattern as app/portal/login/page.tsx — a `button`
// absolutely positioned inside a relative wrapper, an aria-label that
// flips with the state, and a right-padded Input so the typed text never
// runs under the icon. Three independent fields here (not one, like login)
// so each gets its own boolean rather than a single shared one — otherwise
// revealing "New password" would also reveal "Current password" and
// "Confirm new password" at the same time, which isn't what "show this
// field" should mean.
function PasswordField({
  id,
  label,
  autoComplete,
  placeholder,
  hint,
  error,
  visible,
  onToggleVisible,
  registration,
}: {
  id: string;
  label: string;
  autoComplete: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  visible: boolean;
  onToggleVisible: () => void;
  registration: ReturnType<ReturnType<typeof useForm<FormValues>>["register"]>;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-2 flex items-center">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          size="auth"
          className="pr-12"
          aria-invalid={!!error}
          {...registration}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-2.5 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <HugeiconsIcon icon={visible ? ViewOffSlashIcon : ViewIcon} size={19} />
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export default function FirstLoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const onSubmit = (values: FormValues) => {
    setFormError(null);
    startTransition(async () => {
      const result = await firstLoginAction(values);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      if (result.redirectTo) {
        router.push(result.redirectTo);
      }
    });
  };

  return (
    <div
      className="portal flex min-h-svh items-center justify-center bg-white px-5 py-10 sm:px-8"
      style={{ fontFamily: "var(--font-aeonik), ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-center gap-3">
          <Image src="/crest.png" alt="Spring Citadel International School crest" width={44} height={44} className="h-11 w-11 object-contain" />
          <div className="leading-tight text-black">
            <p className="text-[22px]">Spring Citadel</p>
            <p className="text-[16px]">International School</p>
          </div>
        </div>

        <h1 className="text-[length:var(--text-2xl)] font-semibold leading-[var(--leading-display)] tracking-[-0.025em] text-foreground">Set a new password</h1>
        <p className="mb-8 text-[length:var(--text-base)] text-muted-foreground">
          This is a temporary account — choose a new password before you continue.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <PasswordField
            id="currentPassword"
            label="Current password"
            autoComplete="current-password"
            placeholder="The one from your slip"
            error={errors.currentPassword?.message}
            visible={showCurrent}
            onToggleVisible={() => setShowCurrent((v) => !v)}
            registration={register("currentPassword")}
          />

          <PasswordField
            id="newPassword"
            label="New password"
            autoComplete="new-password"
            // The 10-character minimum used to be discoverable only by
            // failing it — twice, since both fields had to be filled first.
            hint="At least 10 characters."
            error={errors.newPassword?.message}
            visible={showNew}
            onToggleVisible={() => setShowNew((v) => !v)}
            registration={register("newPassword")}
          />

          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            visible={showConfirm}
            onToggleVisible={() => setShowConfirm((v) => !v)}
            registration={register("confirmPassword")}
          />

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          {/* Same variant and size as the login button. These two screens
              run back to back and previously shipped 57px square-cornered
              fields with a 60px square button, against 50px/11px fields
              with a 52px/11px button — three geometries in one flow. */}
          <Button
            type="submit"
            variant="brand"
            size="auth"
            loading={isPending}
          >
            {isPending ? "Saving" : "Save and continue"}
          </Button>

          {/* This page had no navigation at all. If the session had expired,
              submitting returned "please sign in again" — not a link, with the
              login URL never shown — and the only exit was editing the address
              bar. */}
          <p className="text-center text-[14px] text-black/70">
            <Link href="/portal/login" className="underline hover:text-black">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
