import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { average, scoreToLetter } from "@/lib/grading";
import { getGradingConfig } from "@/lib/grading-settings";
import { StudentRecordMissing } from "../student-record-missing";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

// Same security boundary as the dashboard: studentId is looked up from
// session.user.id, never accepted as a param. This page's only searchParam
// is `term` — a value out of a fixed 3-item enum, not an identifier of
// anything, so there is nothing here for one student to point at another
// student's data with.
export default async function StudentGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/portal/login");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
  });
  if (!student) {
    // Still shouted about server-side — this IS a data-integrity fault — but
    // the student sees a designed explanation rather than a white screen
    // containing their own session id.
    console.error(`[portal] STUDENT session ${session.user.id} has no matching Student row.`);
    return <StudentRecordMissing />;
  }

  const params = await searchParams;
  const currentTermSetting = await prisma.setting.findUnique({ where: { key: "currentTerm" } });
  const term: TermValue =
    params.term === "TERM_1" || params.term === "TERM_2" || params.term === "TERM_3"
      ? params.term
      : ((currentTermSetting?.value ?? "TERM_1") as TermValue);

  const currentSessionSetting = await prisma.setting.findUnique({ where: { key: "currentSession" } });
  const session_ = currentSessionSetting?.value ?? "";

  // Step 83: draft grades are invisible to students, full stop — this is
  // the only place in the query that matters for that rule.
  const grades = await prisma.grade.findMany({
    where: { studentId: student.id, term, session: session_, status: "SUBMITTED" },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  });

  const avg = average(grades.map((g) => g.total));
  const gradingConfig = await getGradingConfig();
  const letter = avg === null ? null : scoreToLetter(avg, gradingConfig);

  function termHref(t: TermValue) {
    return `?term=${t}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">My grades</h1>

      {/* These look like tabs but are plain links (?term=...), so the
          selected one needs a real signal beyond its background color —
          aria-current="page" is what actually conveys "this is the one
          you're on" to a screen reader, matching the sidebar nav's own
          aria-current usage. */}
      <div className="flex flex-wrap items-center gap-2">
        {(["TERM_1", "TERM_2", "TERM_3"] as const).map((t) => (
          <a
            key={t}
            href={termHref(t)}
            aria-current={t === term ? "page" : undefined}
            className={
              t === term
                ? "rounded-md bg-brand px-3 py-1.5 text-sm text-white"
                : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            }
          >
            {t.replace("_", " ")}
          </a>
        ))}
      </div>

      <div className="rounded-lg border border-border">
        <Table caption={`My grades for ${term.replace("_", " ")}`}>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Assignment</TableHead>
              <TableHead>Midterm</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No results have been submitted for {term.replace("_", " ")} yet.
                </TableCell>
              </TableRow>
            )}
            {grades.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{g.subject.name}</TableCell>
                <TableCell>{g.assignment}</TableCell>
                <TableCell>{g.midterm}</TableCell>
                <TableCell>{g.exam}</TableCell>
                <TableCell className="font-medium">{g.total}</TableCell>
                <TableCell>{g.grade}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {grades.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Term average: <span className="font-medium text-foreground">{avg?.toFixed(1)}</span> ({letter})
        </p>
      )}
    </div>
  );
}
