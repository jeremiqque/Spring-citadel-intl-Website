"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { subjectFormSchema, type SubjectFormValues } from "@/lib/validation/subject";
import { createSubjectAction, updateSubjectAction } from "./actions";

const LEVEL_OPTIONS = [
  { value: "EARLY_YEARS", label: "Early Years" },
  { value: "PRIMARY", label: "Primary" },
  { value: "JSS", label: "Junior Secondary" },
  { value: "SS", label: "Senior Secondary" },
] as const;

const STREAM_OPTIONS = [
  { value: "CORE", label: "Core" },
  { value: "SCIENCE", label: "Science" },
  { value: "ARTS", label: "Arts" },
  { value: "COMMERCIAL", label: "Commercial" },
] as const;

export type SubjectEditTarget = {
  id: string;
  name: string;
  code: string;
  levels: SubjectFormValues["levels"];
  streams: SubjectFormValues["streams"];
  compulsory: boolean;
};

/**
 * One form, two callers: the "Add subject" button at the top of the page
 * (mode="create", no `subject`) and each row's "Edit" action (mode="edit",
 * `subject` set). Same shape as StudentForm's create/edit split — a single
 * schema and a single set of fields, so the two modes can never drift apart.
 *
 * `open`/`onOpenChange` are controlled by the caller rather than this
 * component owning its own trigger, because the edit case is opened from a
 * dropdown menu item (see subject-row-actions.tsx) rather than a visible
 * button next to the dialog.
 */
export function SubjectForm({
  mode,
  subject,
  open,
  onOpenChange,
  trigger,
}: {
  mode: "create" | "edit";
  subject?: SubjectEditTarget;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Only used in create mode — edit mode is opened from outside. */
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: subject?.name ?? "",
      code: subject?.code ?? "",
      levels: subject?.levels ?? [],
      streams: subject?.streams ?? [],
      compulsory: subject?.compulsory ?? false,
    },
  });

  const levels = watch("levels");
  const streams = watch("streams");
  const compulsory = watch("compulsory");

  function toggleLevel(value: (typeof LEVEL_OPTIONS)[number]["value"]) {
    const next = levels.includes(value) ? levels.filter((l) => l !== value) : [...levels, value];
    setValue("levels", next, { shouldValidate: true });
  }

  function toggleStream(value: (typeof STREAM_OPTIONS)[number]["value"]) {
    const next = streams.includes(value) ? streams.filter((s) => s !== value) : [...streams, value];
    setValue("streams", next, { shouldValidate: true });
  }

  const onSubmit = (values: SubjectFormValues) => {
    setFormError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createSubjectAction(values)
          : await updateSubjectAction(subject!.id, values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      if (mode === "create") reset();
      onOpenChange?.(false);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setFormError(null);
        onOpenChange?.(next);
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg text-left">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add a subject" : `Edit ${subject?.name}`}</DialogTitle>
          <DialogDescription>
            Levels decide which classes teach this subject — every class at a level checked below
            gets it, and unchecking a level removes it from every class at that level.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div>
              <Label htmlFor="name">Subject name</Label>
              <Input id="name" className="mt-2" aria-invalid={!!errors.name} {...register("name")} />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                className="mt-2 font-mono uppercase"
                aria-invalid={!!errors.code}
                {...register("code")}
              />
              {errors.code && <p className="mt-1 text-sm text-destructive">{errors.code.message}</p>}
            </div>
          </div>

          <div>
            <Label>Levels</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {LEVEL_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={levels.includes(opt.value)}
                    onChange={() => toggleLevel(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {errors.levels && <p className="mt-1 text-sm text-destructive">{errors.levels.message}</p>}
          </div>

          <div>
            <Label>SS field (optional)</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Only meaningful for Senior Secondary electives. Leave unchecked for a JSS-only or
              compulsory-core subject.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {STREAM_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={streams.includes(opt.value)}
                    onChange={() => toggleStream(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={compulsory}
              onChange={(e) => setValue("compulsory", e.target.checked)}
            />
            Compulsory for every SS student
          </label>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : mode === "create" ? "Add subject" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
