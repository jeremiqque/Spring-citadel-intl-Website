"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { classFormSchema, gradingEnabledForLevel, type ClassFormValues } from "@/lib/validation/class";
import { createClassAction } from "./actions";

const LEVEL_OPTIONS = [
  { value: "EARLY_YEARS", label: "Early Years" },
  { value: "PRIMARY", label: "Primary" },
  { value: "JSS", label: "Junior Secondary (JSS)" },
  { value: "SS", label: "Senior Secondary (SS)" },
] as const;

/**
 * "Add class" only — there is no edit form. See classFormSchema's and
 * createClassAction's own comments: `code` feeds every admission number
 * issued to this class for as long as it exists, so getting it right is a
 * one-time decision made here, at creation, not something reopened later.
 * If a class was set up wrong and nobody has enrolled into it yet, delete it
 * and add it again — that's clean up to the moment the first student
 * arrives, and Delete refuses once anyone has.
 */
export function ClassForm({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: { name: "", code: "", level: "JSS" },
  });

  const level = watch("level");

  const onSubmit = (values: ClassFormValues) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createClassAction(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setFormError(null);
          reset();
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md text-left">
        <DialogHeader>
          <DialogTitle>Add a class</DialogTitle>
          <DialogDescription>
            The code feeds every admission number issued to this class, so it can&apos;t be
            changed once set — double-check it before saving.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <Label htmlFor="name">Class name</Label>
            <Input
              id="name"
              className="mt-2"
              placeholder="JSS 1B"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              className="mt-2 font-mono uppercase"
              placeholder="JSS1B"
              aria-invalid={!!errors.code}
              {...register("code")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Letters and numbers only. Used in every admission number this class issues, e.g.
              SCIS/2026/{watch("code") || "JSS1B"}/001.
            </p>
            {errors.code && <p className="mt-1 text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div>
            <Label>Level</Label>
            <Select value={level} onValueChange={(v) => setValue("level", v as ClassFormValues["level"], { shouldValidate: true })}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {gradingEnabledForLevel(level)
                ? "Grade entry will be enabled for this class, per the school's JSS/SS scheme."
                : "Grade entry stays off for this level — Early Years and Primary aren't scored."}
            </p>
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
