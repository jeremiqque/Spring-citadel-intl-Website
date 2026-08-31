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
  doneHref,
}: {
  mode: "create" | "edit";
  studentId?: string;
  classes: ClassOption[];
  defaultValues?: Partial<StudentFormValues>;
  // Where "Done" on the post-enroll credentials dialog goes. Admin's own
  // enroll page leaves this unset and falls back to the student's admin
  // profile page, as before. The teacher enroll page passes its own
  // destination — a teacher can't reach /portal/admin/students/[id] at all
  // (middleware bounces that whole prefix to non-admins), and there's no
  // teacher-facing per-student page to send them to instead.
  doneHref?: string;
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

      nationality: defaultValues?.nationality ?? "",
      motherTongue: defaultValues?.motherTongue ?? "",
      placeOfBirth: defaultValues?.placeOfBirth ?? "",
      previousSchool: defaultValues?.previousSchool ?? "",

      sibling1Name: defaultValues?.sibling1Name ?? "",
      sibling1Class: defaultValues?.sibling1Class ?? "",
      sibling2Name: defaultValues?.sibling2Name ?? "",
      sibling2Class: defaultValues?.sibling2Class ?? "",
      sibling3Name: defaultValues?.sibling3Name ?? "",
      sibling3Class: defaultValues?.sibling3Class ?? "",

      fatherName: defaultValues?.fatherName ?? "",
      fatherNationality: defaultValues?.fatherNationality ?? "",
      fatherState: defaultValues?.fatherState ?? "",
      fatherProfession: defaultValues?.fatherProfession ?? "",
      fatherEmployer: defaultValues?.fatherEmployer ?? "",
      fatherPoBox: defaultValues?.fatherPoBox ?? "",
      fatherAddress: defaultValues?.fatherAddress ?? "",
      fatherPhone: defaultValues?.fatherPhone ?? "",
      fatherEmail: defaultValues?.fatherEmail ?? "",

      motherName: defaultValues?.motherName ?? "",
      motherNationality: defaultValues?.motherNationality ?? "",
      motherState: defaultValues?.motherState ?? "",
      motherProfession: defaultValues?.motherProfession ?? "",
      motherEmployer: defaultValues?.motherEmployer ?? "",
      motherPoBox: defaultValues?.motherPoBox ?? "",
      motherAddress: defaultValues?.motherAddress ?? "",
      motherPhone: defaultValues?.motherPhone ?? "",
      motherEmail: defaultValues?.motherEmail ?? "",
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
          <h2 className="text-sm font-medium text-foreground">Additional details</h2>
          <p className="text-sm text-muted-foreground">
            From the admission form. All optional — fill in what you have.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" className="mt-2" {...register("nationality")} />
            </div>
            <div>
              <Label htmlFor="motherTongue">Mother tongue</Label>
              <Input id="motherTongue" className="mt-2" {...register("motherTongue")} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="placeOfBirth">Place of birth</Label>
              <Input id="placeOfBirth" className="mt-2" {...register("placeOfBirth")} />
            </div>
            <div>
              <Label htmlFor="previousSchool">Previous school</Label>
              <Input id="previousSchool" className="mt-2" {...register("previousSchool")} />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Sibling(s) studying in the school</Label>
            {([1, 2, 3] as const).map((n) => (
              <div key={n} className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <Input
                  aria-label={`Sibling ${n} name`}
                  placeholder="Name"
                  {...register(`sibling${n}Name` as const)}
                />
                <Input
                  aria-label={`Sibling ${n} class`}
                  placeholder="Class"
                  {...register(`sibling${n}Class` as const)}
                />
              </div>
            ))}
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

        <div className="space-y-5 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-foreground">Father's details</h2>
          <p className="text-sm text-muted-foreground">Optional — from the admission form.</p>

          <div>
            <Label htmlFor="fatherName">Father's details full name</Label>
            <Input id="fatherName" className="mt-2" {...register("fatherName")} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="fatherNationality">Nationality</Label>
              <Input id="fatherNationality" className="mt-2" {...register("fatherNationality")} />
            </div>
            <div>
              <Label htmlFor="fatherState">State</Label>
              <Input id="fatherState" className="mt-2" {...register("fatherState")} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="fatherProfession">Profession</Label>
              <Input id="fatherProfession" className="mt-2" {...register("fatherProfession")} />
            </div>
            <div>
              <Label htmlFor="fatherEmployer">Employer</Label>
              <Input id="fatherEmployer" className="mt-2" {...register("fatherEmployer")} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="fatherPoBox">P.O. Box</Label>
              <Input id="fatherPoBox" className="mt-2" {...register("fatherPoBox")} />
            </div>
            <div>
              <Label htmlFor="fatherAddress">Residential address</Label>
              <Input id="fatherAddress" className="mt-2" {...register("fatherAddress")} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="fatherPhone">Mobile no.</Label>
              <Input id="fatherPhone" className="mt-2" {...register("fatherPhone")} />
            </div>
            <div>
              <Label htmlFor="fatherEmail">Email</Label>
              <Input
                id="fatherEmail"
                type="email"
                className="mt-2"
                aria-invalid={!!errors.fatherEmail}
                {...register("fatherEmail")}
              />
              {errors.fatherEmail && (
                <p className="mt-1 text-sm text-destructive">{errors.fatherEmail.message}</p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-5 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-foreground">Mother's details</h2>
          <p className="text-sm text-muted-foreground">Optional — from the admission form.</p>

          <div>
            <Label htmlFor="motherName">Mother's details full name</Label>
            <Input id="motherName" className="mt-2" {...register("motherName")} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="motherNationality">Nationality</Label>
              <Input id="motherNationality" className="mt-2" {...register("motherNationality")} />
            </div>
            <div>
              <Label htmlFor="motherState">State</Label>
              <Input id="motherState" className="mt-2" {...register("motherState")} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="motherProfession">Profession</Label>
              <Input id="motherProfession" className="mt-2" {...register("motherProfession")} />
            </div>
            <div>
              <Label htmlFor="motherEmployer">Employer</Label>
              <Input id="motherEmployer" className="mt-2" {...register("motherEmployer")} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="motherPoBox">P.O. Box</Label>
              <Input id="motherPoBox" className="mt-2" {...register("motherPoBox")} />
            </div>
            <div>
              <Label htmlFor="motherAddress">Residential address</Label>
              <Input id="motherAddress" className="mt-2" {...register("motherAddress")} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="motherPhone">Mobile no.</Label>
              <Input id="motherPhone" className="mt-2" {...register("motherPhone")} />
            </div>
            <div>
              <Label htmlFor="motherEmail">Email</Label>
              <Input
                id="motherEmail"
                type="email"
                className="mt-2"
                aria-invalid={!!errors.motherEmail}
                {...register("motherEmail")}
              />
              {errors.motherEmail && (
                <p className="mt-1 text-sm text-destructive">{errors.motherEmail.message}</p>
              )}
            </div>
          </div>
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
            router.push(doneHref ?? `/portal/admin/students/${credentials.studentId}`);
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
                if (credentials) router.push(doneHref ?? `/portal/admin/students/${credentials.studentId}`);
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
