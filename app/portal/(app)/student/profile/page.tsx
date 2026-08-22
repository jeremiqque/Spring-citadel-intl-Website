import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { StudentRecordMissing } from "../student-record-missing";

// SECURITY BOUNDARY — same rule as the student dashboard: `studentId` is
// never read from a URL param, a form field, or anything else the client
// controls. It is looked up server-side from `session.user.id`, which the
// session callback sets from the authenticated token. There is deliberately
// no /portal/student/[id] route, so "Student A cannot reach Student B's
// profile" holds by construction, not by a check someone has to remember.

// A read-only row. Students cannot correct their own record — a wrong date of
// birth or guardian phone is fixed by an admin through the admin screens, so
// this page only ever displays.
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

export default async function StudentProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/portal/login"); // defense in depth; middleware already guarantees this

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: { user: true, class: true },
  });

  if (!student) {
    // A STUDENT session with no Student row is a data-integrity fault, not a
    // user error — shout about it server-side, but show the student the same
    // designed explanation the dashboard uses rather than a white screen.
    console.error(`[portal] STUDENT session ${session.user.id} has no matching Student row.`);
    return <StudentRecordMissing />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{student.user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {student.admissionNo} — {student.class.name}
          </p>
        </div>
        {/* The raw status is deliberately NOT shown here. AT_RISK is an
            internal flag for staff: it is derived from an average, has no
            definition anywhere in the UI, and there is no appeal route — a
            thirteen-year-old opening their own profile should not be told
            "AT RISK" by a badge. Students see only whether their enrolment
            is active; staff still see the full status on the admin screens. */}
        {student.status === "INACTIVE" ? (
          <Badge variant="outline">Not enrolled</Badge>
        ) : (
          <Badge variant="success">Enrolled</Badge>
        )}
      </div>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground">Personal details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Date of birth" value={student.dob.toLocaleDateString()} />
            <Row label="Gender" value={student.gender.charAt(0) + student.gender.slice(1).toLowerCase()} />
            <Row label="Class" value={student.class.name} />
            <Row label="Admission number" value={student.admissionNo} />
          </dl>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground">Guardian</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={student.guardianName} />
            <Row label="Phone" value={student.guardianPhone} />
          </dl>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground">Address</h2>
          <p className="text-sm whitespace-pre-line">{student.address}</p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground">Account</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Email" value={student.user.email} />
          </dl>
        </div>
      </section>

      <p className="text-sm text-muted-foreground">
        These details are maintained by the school. If anything here is wrong, contact the school
        office to have it corrected.
      </p>
    </div>
  );
}
