"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label + control + error message, wired together.
 *
 * WHY THIS EXISTS — the error paragraph was copy-pasted about fifteen times
 * across the app, at four different sizes (`text-sm`, `text-xs`,
 * `text-[13px]`, `text-[13.5px]`). Some carried `role="alert"` and some
 * didn't. And none of them were connected to their input.
 *
 * That last part is the real defect. Every form here sets `aria-invalid` on
 * the field, so a screen reader announces "invalid entry" — and then has
 * nothing to read, because no `aria-describedby` points at the message that
 * explains why. The user is told they are wrong but not what is wrong.
 *
 * This component owns the ids so that can't drift: pass `error` and the
 * control is described by it automatically.
 *
 * Usage:
 *   <Field label="Guardian phone" error={errors.guardianPhone?.message}>
 *     {(props) => <Input {...props} {...register("guardianPhone")} />}
 *   </Field>
 */
export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  /** Shown when there is no error — rules the user should know up front. */
  hint?: string;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
    "aria-required": boolean | undefined;
  }) => React.ReactNode;
}) {
  const id = React.useId();
  const messageId = `${id}-message`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      {children({
        id,
        "aria-invalid": !!error,
        // Points at the error when there is one, the hint otherwise — the
        // hint is worth announcing too ("at least 10 characters" is exactly
        // the sort of rule people discover by failing it).
        "aria-describedby": error || hint ? messageId : undefined,
        "aria-required": required || undefined,
      })}

      {error ? (
        <p id={messageId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
