"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validation/id";
import { BCRYPT_COST } from "@/lib/password";
import { generateTempPassword } from "@/lib/temp-password";
import { adminFormSchema, type AdminFormValues } from "@/lib/validation/admin";

// Defense in depth, not the real gate: middleware's authorized() callback
// already keeps a non-ADMIN session from reaching a page that could call
// these. This is what stops a crafted request straight at the action itself.
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export type CreateAdminResult =
  | { ok: true; adminId: string; email: string; tempPassword: string }
  | { ok: false; error: string };

// Why this exists at all: before this action, there was exactly one admin
// account per school (see lib/ids.ts's comment on nextStaffId), which meant
// a forgotten password had no recovery path in the app — nobody with admin
// access existed to reset it. This is the fix: a second (or third) admin
// can now exist, and can reset each other's passwords the same way admins
// already reset teachers' and students'.
export async function createAdminAction(values: AdminFormValues): Promise<CreateAdminResult> {
  await requireAdmin();

  const parsed = adminFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  // A friendly, specific error rather than the generic catch-all below —
  // unlike a teacher's internal @staff.springcitadel.internal address
  // (server-generated, guaranteed unique), this email is typed by a human
  // and colliding with an existing account is a real, expected case.
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, BCRYPT_COST);

  try {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hash,
        role: "ADMIN",
        mustChangePassword: true,
      },
    });

    revalidatePath("/portal/admin/admins");

    return { ok: true, adminId: user.id, email: user.email, tempPassword };
  } catch (err) {
    console.error("createAdminAction failed:", err);
    return { ok: false, error: "Could not create the admin. Please try again." };
  }
}

export type ResetPasswordResult = { ok: true; tempPassword: string } | { ok: false; error: string };

// Mirrors resetTeacherPasswordAction/resetStudentPasswordAction exactly —
// same temp-password mechanism, same forced mustChangePassword, same
// session kill via tokenVersion. This is the actual "I forgot my admin
// password" fix: a SECOND admin runs this against the locked-out one. It
// does nothing for a school with only one admin — creating a second admin
// (createAdminAction, above) is what makes this reachable at all.
export async function resetAdminPasswordAction(adminId: string): Promise<ResetPasswordResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(adminId);
  if (!parsedId.success) {
    return { ok: false, error: "Admin not found." };
  }

  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") {
    return { ok: false, error: "Admin not found." };
  }

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, BCRYPT_COST);

  try {
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        password: hash,
        mustChangePassword: true,
        // Kill any session already open on this account — a reset that
        // leaves a stolen (or simply forgotten-but-still-logged-in) cookie
        // working is not a reset. Same reasoning as the teacher/student
        // reset actions.
        tokenVersion: { increment: 1 },
      },
    });
  } catch (err) {
    console.error("resetAdminPasswordAction failed:", err);
    return { ok: false, error: "Could not reset the password. Please try again." };
  }

  revalidatePath("/portal/admin/admins");

  return { ok: true, tempPassword };
}
