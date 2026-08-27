import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockKeyIcon, UserCircleIcon, IdentityCardIcon } from "@hugeicons/core-free-icons";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { ReadOnlyField } from "./field";
import { StaffProfileForm } from "./staff-profile-form";
import { StudentProfileForm } from "./student-profile-form";
import { PasswordForm } from "./password-form";
import { StudentRecordMissing } from "../student/student-record-missing";

/**
 * My profile — the one self-service account page, for all three roles.
 *
 * ── WHY ONE ROUTE AND NOT THREE ────────────────────────────────────────────
 * Three near-identical /admin/profile, /teacher/profile, /student/profile
 * pages would be three copies of the same password form and the same
 * identity header, drifting apart the first time one of them is fixed. The
 * subject of this page is "the signed-in user", which is the same subject
 * whatever their role — only the SECTIONS differ. So the route is
 * /portal/profile for everyone and the role picks the sections.
 * /portal/student/profile still exists and redirects here, because it was a
 * real, linked URL before this page and may be bookmarked.
 *
 * ── THE PERMISSION MODEL, STATED ON THE PAGE ───────────────────────────────
 * This portal deliberately splits a person's record in two:
 *
 *   EDITABLE — how to reach or address you. Staff: your name and phone.
 *              Students: your own phone. Everyone: your password.
 *
 *   SCHOOL RECORD — admission number, staff ID, class, date of birth,
 *              gender, guardian details, status, login email. Set by the
 *              office and corrected by the office. These are records of
 *              record: they are printed on documents, they decide which
 *              roster and grade sheet a child appears on, and some of them
 *              are authorisation inputs. A student is also a minor, and
 *              their name is the name printed on their results.
 *
 * The single most important design decision here is that those two halves
 * LOOK different and say which is which, in words, next to the fields. A
 * profile screen that mixes editable and fixed fields into one visual
 * treatment produces exactly one outcome: people type into things that
 * cannot be saved and conclude the app is broken. The read-only half is a
 * definition list with a lock on its header, never a greyed-out input —
 * see the note on ReadOnlyField in ./field.tsx.
 *
 * SECURITY: nothing on this page is the boundary. It renders from
 * `session.user.id` and never takes an id from the URL, and every write goes
 * through ./actions.ts, which re-derives the user and re-reads their role
 * from the database on every call.
 */

const ROLE_LABEL = {
  ADMIN: "Administrator",
  TEACHER: "Teacher",
  STUDENT: "Student",
} as const;

function initial(name: string) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

function titleCase(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

export default async function ProfilePage() {
  const session = await auth();
  // Defense in depth — middleware already guarantees a session here.
  if (!session?.user?.id) redirect("/portal/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      teacher: {
        select: {
          staffId: true,
          phone: true,
          gender: true,
          status: true,
          primarySubject: { select: { name: true } },
        },
      },
      student: {
        select: {
          admissionNo: true,
          dob: true,
          gender: true,
          guardianName: true,
          guardianPhone: true,
          address: true,
          status: true,
          contactPhone: true,
          class: { select: { name: true } },
        },
      },
    },
  });

  if (!user) redirect("/portal/login");

  const isStudent = user.role === "STUDENT";
  const isTeacher = user.role === "TEACHER";

  if (isStudent && !user.student) {
    // A STUDENT session with no Student row is a data-integrity fault, not a
    // user error — shout about it server-side, but show the same designed
    // explanation the dashboard uses rather than a white screen.
    console.error(`[portal] STUDENT session ${user.id} has no matching Student row.`);
    return <StudentRecordMissing />;
  }

  const subtitle = isStudent
    ? user.student!.admissionNo
    : isTeacher && user.teacher
      ? user.teacher.staffId
      : user.email;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My account"
        title="Profile"
        description="Your details, what the school holds on record, and your password."
      />

      {/* IDENTITY BANNER — who you are signed in as.
          Its job is orientation, not data: on a page that deliberately shows
          some fields you can change and some you cannot, the first thing to
          establish is whose record this is and in what capacity. Everything
          here is duplicated in a labelled row further down; this is the
          glance version. */}
      <Surface className="flex flex-wrap items-center gap-x-5 gap-y-4">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xl font-semibold text-brand"
        >
          {initial(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg leading-heading font-semibold text-foreground">
            {user.name}
          </h2>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {user.email}
            {subtitle !== user.email && (
              <>
                {" · "}
                <span className="font-mono text-xs">{subtitle}</span>
              </>
            )}
          </p>
        </div>
        <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
      </Surface>

      {/* Editable first, read-only second — in the DOM as well as on screen,
          so the reading order and the tab order both put what you CAN do
          ahead of what you can only look at. On a narrow screen that
          ordering is the whole layout. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Surface padding="none">
            <SurfaceHeader>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <HugeiconsIcon icon={UserCircleIcon} size={15} className="text-blue-800" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-foreground">Your details</h2>
                <p className="text-xs text-muted-foreground">
                  {isStudent
                    ? "The one detail on your record you can change yourself."
                    : "Change these yourself — they update everywhere in the portal."}
                </p>
              </div>
            </SurfaceHeader>
            <div className="p-5">
              {isStudent ? (
                <StudentProfileForm initialContactPhone={user.student!.contactPhone ?? ""} />
              ) : (
                <StaffProfileForm
                  initialName={user.name}
                  initialPhone={user.teacher?.phone ?? ""}
                  showPhone={isTeacher && Boolean(user.teacher)}
                />
              )}
            </div>
          </Surface>

          <Surface padding="none">
            <SurfaceHeader>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <HugeiconsIcon icon={LockKeyIcon} size={15} className="text-amber-800" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-foreground">Password</h2>
                <p className="text-xs text-muted-foreground">
                  You need your current password to set a new one.
                </p>
              </div>
            </SurfaceHeader>
            <div className="p-5">
              <PasswordForm />
            </div>
          </Surface>
        </div>

        {/* SCHOOL RECORD — read-only, and visibly so. The lock chip and the
            sentence in the footer together answer the question this card
            would otherwise raise on every visit: "why can't I edit this, and
            who can?" An unexplained locked field reads as a bug. */}
        <Surface padding="none" className="lg:self-start">
          <SurfaceHeader>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon
                icon={IdentityCardIcon}
                size={15}
                className="text-muted-foreground"
                aria-hidden
              />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-foreground">School record</h2>
              <p className="text-xs text-muted-foreground">Maintained by the office</p>
            </div>
          </SurfaceHeader>

          <dl className="divide-y divide-border px-5 py-4">
            {isStudent && user.student && (
              <>
                <ReadOnlyField label="Full name" value={user.name} />
                <ReadOnlyField
                  label="Admission no."
                  value={<span className="font-mono text-xs">{user.student.admissionNo}</span>}
                />
                <ReadOnlyField label="Class" value={user.student.class.name} />
                <ReadOnlyField
                  label="Date of birth"
                  value={user.student.dob.toLocaleDateString()}
                />
                <ReadOnlyField label="Gender" value={titleCase(user.student.gender)} />
                <ReadOnlyField label="Guardian" value={user.student.guardianName} />
                <ReadOnlyField label="Guardian phone" value={user.student.guardianPhone} />
                <ReadOnlyField
                  label="Address"
                  value={<span className="whitespace-pre-line">{user.student.address}</span>}
                />
                {/* The raw status is deliberately NOT shown. AT_RISK is an
                    internal staff flag: derived from an average, defined
                    nowhere in the UI, with no appeal route. A thirteen-year-
                    old opening their own profile should not be told "AT RISK"
                    by a badge. Enrolment state is all they need. */}
                <ReadOnlyField
                  label="Enrolment"
                  value={
                    user.student.status === "INACTIVE" ? (
                      <Badge variant="outline">Not enrolled</Badge>
                    ) : (
                      <Badge variant="success">Enrolled</Badge>
                    )
                  }
                />
              </>
            )}

            {isTeacher && user.teacher && (
              <>
                <ReadOnlyField
                  label="Staff ID"
                  value={<span className="font-mono text-xs">{user.teacher.staffId}</span>}
                />
                <ReadOnlyField
                  label="Primary subject"
                  value={user.teacher.primarySubject?.name ?? "—"}
                />
                <ReadOnlyField label="Gender" value={titleCase(user.teacher.gender)} />
                <ReadOnlyField
                  label="Status"
                  value={
                    <Badge variant={user.teacher.status === "ACTIVE" ? "success" : "warning"}>
                      {titleCase(user.teacher.status.replace("_", " "))}
                    </Badge>
                  }
                />
              </>
            )}

            {/* Email is on the record half for EVERYONE, including admins.
                It is the login identity and is unique-constrained, so
                changing it is an account-recovery operation, not a profile
                edit — it needs a uniqueness check and a re-authentication
                step that do not exist in this build. Showing it here, locked,
                is honest; a live field that silently could not be saved
                would not be. */}
            <ReadOnlyField label="Email" value={<span className="break-all">{user.email}</span>} />
            <ReadOnlyField label="Role" value={ROLE_LABEL[user.role]} />
            <ReadOnlyField label="Account created" value={user.createdAt.toLocaleDateString()} />
          </dl>

          <p className="border-t border-border px-5 py-3 text-xs leading-body text-muted-foreground">
            If anything here is wrong, contact the school office — these details are corrected by
            an administrator so the change is recorded against your file.
          </p>
        </Surface>
      </div>
    </div>
  );
}
