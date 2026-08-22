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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { adminFormSchema, type AdminFormValues } from "@/lib/validation/admin";
import { createAdminAction } from "./actions";

type Credentials = { adminId: string; email: string; tempPassword: string };

export function AdminForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminFormValues>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: { name: "", email: "" },
  });

  const onSubmit = (values: AdminFormValues) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createAdminAction(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setCredentials({
        adminId: result.adminId,
        email: result.email,
        tempPassword: result.tempPassword,
      });
    });
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(
      `Email: ${credentials.email}\nTemporary password: ${credentials.tempPassword}`
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
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            className="mt-2"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email ? (
            <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
          ) : (
            // Unlike a teacher's staff ID, this is what they'll actually type
            // to sign in — see auth.ts's identifyCredential, which routes
            // anything with an "@" through the email lookup.
            <p className="mt-1 text-xs text-muted-foreground">
              This is what they&apos;ll sign in with — a real address they check.
            </p>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Add admin"}
        </Button>
      </form>

      {/* Shown exactly once — this password is not retrievable again after
          this dialog closes. Another admin resetting this one's password
          (Admins list actions) is the only way to issue a new one later. */}
      <Dialog
        open={!!credentials}
        onOpenChange={(open) => {
          if (!open && credentials) {
            router.push("/portal/admin/admins");
          }
        }}
      >
        <DialogContent showClose={false}>
          <DialogHeader>
            <DialogTitle>Admin added</DialogTitle>
            <DialogDescription>
              Write these down or copy them now — this password will not be shown again.
              They must change it on first login.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4 font-mono text-sm">
              <p>Email: {credentials.email}</p>
              <p>Temporary password: {credentials.tempPassword}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={copyCredentials}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={() => router.push("/portal/admin/admins")}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
