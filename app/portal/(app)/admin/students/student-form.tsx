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
import { studentFormSchema, type StudentFormValues } from "@/lib/validation/student";
import { createStudentAction, updateStudentAction } from "./actions";

type ClassOption = { id: string; name: string; code: string };

type Credentials = { studentId: string; admissionNo: string; tempPassword: string };

export function StudentForm({
  mode,
  studentId,
  classes,
  defaultValues,
}: {
  mode: "create" | "edit";
  studentId?: string;
  classes: ClassOption[];
  defaultValues?: Partial<StudentFormValues>;
}) {
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
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      dob: defaultValues?.dob ?? "",
      gender: defaultValues?.gender ?? "MALE",
      classId: defaultValues?.classId ?? "",
      guardianName: defaultValues?.guardianName ?? "",
      guardianPhone: defaultValues?.guardianPhone ?? "",
      address: defaultValues?.address ?? "",
    },
  });

  const gender = watch("gender");
  const classId = watch("classId");

  const onSubmit = (values: StudentFormValues) => {
    setFormError(null);
    startTransition(async () => {
      if (mode === "create") {
        const result = await createStudentAction(values);
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        setCredentials({
          studentId: result.studentId,
          admissionNo: result.admissionNo,
          tempPassword: result.tempPassword,
        });
      } else if (studentId) {
        const result = await updateStudentAction(studentId, values);
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        router.push(`/portal/admin/students/${studentId}`);
      }
    });
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(
      `Admission No.: ${credentials.admissionNo}\nTemporary password: ${credentials.tempPassword}`
    );
    setCopied(true);
  };

  return (
    <>
      {/* Was seven fields in one flat column, no grouping, at a width that
          left most of the page empty on any screen over ~700px — the same
          "single boring column" problem the settings screens had before
          those got split into named sections. Grouped into two named
          sections instead, with short fields (date of birth/gender,
          guardian name/phone) paired side by side rather than each getting
          its own full-width row. */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-8">
        <div className="space-y-5">
          <h2 className="text-sm font-medium text-foreground">Student details</h2>

          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" className="mt-2" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" className="mt-2" aria-invalid={!!errors.dob} {...register("dob")} />
              {errors.dob && <p className="mt-1 text-sm text-destructive">{errors.dob.message}</p>}
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
          </div>

          <div>
            <Label>Class</Label>
            <Select value={classId} onValueChange={(v) => setValue("classId", v, { shouldValidate: true })}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.classId && <p className="mt-1 text-sm text-destructive">{errors.classId.message}</p>}
          </div>
        </div>

        <div className="space-y-5 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-foreground">Guardian details</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="guardianName">Guardian full name</Label>
              <Input
                id="guardianName"
                className="mt-2"
                aria-invalid={!!errors.guardianName}
                {...register("guardianName")}
              />
              {errors.guardianName && (
                <p className="mt-1 text-sm text-destructive">{errors.guardianName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="guardianPhone">Guardian phone number</Label>
              <Input
                id="guardianPhone"
                className="mt-2"
                aria-invalid={!!errors.guardianPhone}
                {...register("guardianPhone")}
              />
              {errors.guardianPhone && (
                <p className="mt-1 text-sm text-destructive">{errors.guardianPhone.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" className="mt-2" aria-invalid={!!errors.address} {...register("address")} />
            {errors.address && <p className="mt-1 text-sm text-destructive">{errors.address.message}</p>}
          </div>
        </div>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : mode === "create" ? "Enroll student" : "Save changes"}
        </Button>
      </form>

      {/* Shown exactly once, right after creation — this is the only place
          the temporary password is ever displayed. It is not retrievable
          again afterwards; the admin must reset it if it's lost. */}
      <Dialog
        open={!!credentials}
        onOpenChange={(open) => {
          if (!open && credentials) {
            router.push(`/portal/admin/students/${credentials.studentId}`);
          }
        }}
      >
        <DialogContent showClose={false}>
          <DialogHeader>
            <DialogTitle>Student enrolled</DialogTitle>
            <DialogDescription>
              Write these down or copy them now — this password will not be shown again.
              The student must change it on first login.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4 font-mono text-sm">
              <p>Admission No.: {credentials.admissionNo}</p>
              <p>Temporary password: {credentials.tempPassword}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={copyCredentials}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              onClick={() => {
                if (credentials) router.push(`/portal/admin/students/${credentials.studentId}`);
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
