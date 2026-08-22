import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { average, scoreToLetter } from "@/lib/grading";
import { getGradingConfig } from "@/lib/grading-settings";
import { parseTerm } from "@/lib/validation/id";
import { StudentRecordMissing } from "./student-record-missing";

// SECURITY BOUNDARY — the whole point of this page. `studentId` never comes
// from a URL param, a form field, or anything else client-supplied: it is
// looked up server-side from `session.user.id`, which the JWT/session
// callbacks in auth.config.ts set from the authenticated token. There is no
// route on the student side that takes a student ID as input — that's what
// makes "Student A can't reach Student B's data" true by construction rather
// than by a check that could be forgotten on some future page.
export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/portal/login"); // defense in depth; middleware already guarantees this

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: { class: true },
  });

  if (!student) {
    // Still shouted about server-side — this IS a data-integrity fault — but
    // the student sees a designed explanation rather than a white screen
    // containing their own session id.
    console.error(`[portal] STUDENT session ${session.user.id} has no matching Student row.`);
    return <StudentRecordMissing />;
  }

  const [currentSessionSetting, currentTermSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
  ]);
  const currentSession = currentSessionSetting?.value ?? "";
  // Parsed, not cast — this feeds a Prisma `where`.
  const currentTerm = parseTerm(currentTermSetting?.value) ?? "TERM_1";

  // Step 83: draft grades are invisible to students — status: "SUBMITTED"
  // is not optional here, it's the entire rule for this package.
  const myGrades = await prisma.grade.findMany({
    where: {
      studentId: student.id,
      term: currentTerm,
      session: currentSession,
      status: "SUBMITTED",
    },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  });

  const myAverage = average(myGrades.map((g) => g.total));
  // The letter shown here is derived from an AVERAGE across subjects, so
  // there is no stored Grade.grade to read it off — it has to be banded
  // live, which means it has to use the school's live bands, not the
  // compiled-in defaults.
  const gradingConfig = await getGradingConfig();
  const myLetter = myAverage === null ? null : scoreToLetter(myAverage, gradingConfig);

  // Class average — computed as the average of each classmate's own
  // per-subject average, not a flat average of every score row (which would
  // silently weight a class differently depending on how many subjects
  // happened to be submitted for each student). This is what "average
  // against the class average, not a rank" (step 81) actually compares:
  // the same kind of number on both sides.
  // Class average — the mean of each classmate's own per-subject mean, not a
  // flat mean of every score row (which would weight a class differently
  // depending on how many subjects happened to be submitted per student).
  //
  // Grouped in SQL. This previously fetched every submitted grade row for the
  // whole class and reduced them in JavaScript: students x subjects rows, per
  // render, for a single scalar that is IDENTICAL for every student in the
  // class. On results day a 40-student class refreshing dashboards pulled
  // ~16,000 rows to produce one number forty times. groupBy returns one row
  // per classmate instead, served entirely from @@index([classId, term,
  // session]).
  const perStudent = await prisma.grade.groupBy({
    by: ["studentId"],
    where: { classId: student.classId, term: currentTerm, session: currentSession, status: "SUBMITTED" },
    _avg: { total: true },
  });
  const classAverage =
    perStudent.length > 0
      ? perStudent.reduce((sum, r) => sum + (r._avg.total ?? 0), 0) / perStudent.length
      : null;

  // Term progress — how many of the subjects taught at this class's level
  // have a submitted grade for this student specifically, this term.
  // Term progress. There is deliberately NO denominator any more.
  //
  // It used to be "every subject registered at this student's level", which
  // is right for JSS and wrong for SS: an SS student takes the compulsory
  // core plus electives from ONE field, so counting all three fields told
  // Musa he was 0/36 when 9 would be a complete term. The database has no
  // record of which electives a given student takes (there is no
  // StudentSubject table), so there is no correct denominator to compute —
  // and a wrong one that reads as failure is worse than none. Restore the
  // fraction when subject selection is modelled.
  const submittedCount = myGrades.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome, {session.user.name}</h1>
        <p className="text-sm text-muted-foreground">
          {student.admissionNo} — {student.class.name}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Your average — {currentTerm.replace("_", " ")}</p>
          <p data-numeric className="mt-1 text-2xl font-semibold text-foreground">
            {myAverage === null ? "—" : myAverage.toFixed(1)}
          </p>
          {myLetter && <p className="text-sm text-muted-foreground">Grade {myLetter}</p>}
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Class average</p>
          <p data-numeric className="mt-1 text-2xl font-semibold text-foreground">
            {classAverage === null ? "—" : classAverage.toFixed(1)}
          </p>
          {myAverage !== null && classAverage !== null && (
            <p className="text-sm text-muted-foreground">
              {myAverage >= classAverage ? "At or above" : "Below"} the class average
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Term progress</p>
          <p data-numeric className="mt-1 text-2xl font-semibold text-foreground">
            {submittedCount}
          </p>
          <p className="text-sm text-muted-foreground">
            {submittedCount === 1 ? "subject graded so far" : "subjects graded so far"}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Subjects — {currentTerm.replace("_", " ")}</h2>
          <Link href="/portal/student/grades" className="text-xs text-brand hover:underline">
            Full grade history
          </Link>
        </div>
        {myGrades.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No results have been submitted for you yet this term.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myGrades.map((g) => (
              <div key={g.id} className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-foreground">{g.subject.name}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {g.total} <span className="text-sm font-normal text-muted-foreground">({g.grade})</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
