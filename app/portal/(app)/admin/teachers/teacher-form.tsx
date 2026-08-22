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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { teacherFormSchema, type TeacherFormValues } from "@/lib/validation/teacher";
import { createTeacherAction } from "./actions";

type SubjectOption = { id: string; name: string };
type Credentials = { teacherId: string; staffId: string; tempPassword: string };

export function TeacherForm({ subjects }: { subjects: SubjectOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: { name: "", phone: "", gender: "MALE", primarySubjectId: "" },
  });

  const gender = watch("gender");
  const primarySubjectId = watch("primarySubjectId");

  const onSubmit = (values: TeacherFormValues) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createTeacherAction(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setCredentials({
        teacherId: result.teacherId,
        staffId: result.staffId,
        tempPassword: result.tempPassword,
      });
    });
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(
      `Staff ID: ${credentials.staffId}\nTemporary password: ${credentials.tempPassword}`
    );
    setCopied(true);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-xl space-y-5">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" className="mt-2" aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" className="mt-2" aria-invalid={!!errors.phone} {...register("phone")} />
          {errors.phone && <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>}
        </div>

        <div>
          <Label>Gender</Label>
          <Select
            value={gender}
            onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE", { shouldValidate: true })}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && <p className="mt-1 text-sm text-destructive">{errors.gender.message}</p>}
        </div>

        <div>
          <Label>Primary subject (optional)</Label>
          <Select
            value={primarySubjectId}
            onValueChange={(v) => setValue("primarySubjectId", v, { shouldValidate: true })}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select a subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            What they can actually grade is set separately, per class, after creation.
          </p>
        </div>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Add teacher"}
        </Button>
      </form>

      {/* Shown exactly once — this password is not retrievable again after
          this dialog closes. Admin password reset (Teacher actions) is the
          only way to issue a new one later. */}
      <Dialog
        open={!!credentials}
        onOpenChange={(open) => {
          if (!open && credentials) {
            router.push(`/portal/admin/teachers/${credentials.teacherId}`);
          }
        }}
      >
        <DialogContent showClose={false}>
          <DialogHeader>
            <DialogTitle>Teacher added</DialogTitle>
            <DialogDescription>
              Write these down or copy them now — this password will not be shown again.
              The teacher must change it on first login.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4 font-mono text-sm">
              <p>Staff ID: {credentials.staffId}</p>
              <p>Temporary password: {credentials.tempPassword}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={copyCredentials}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              onClick={() => {
                if (credentials) router.push(`/portal/admin/teachers/${credentials.teacherId}`);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
