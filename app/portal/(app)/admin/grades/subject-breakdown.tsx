"use client";

import Link from "next/link";
import type { LetterGrade } from "@prisma/client";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GRADE_BAND_CLASS } from "@/lib/grading";

export type SubjectScore = {
  id: string;
  name: string;
  total: number | null;
  grade: LetterGrade | null;
};

// GRADE_BAND_CLASS (lib/grading.ts) covers the four graded bands; "NONE" is
// this component's own ungraded state, styled to read as an absence rather
// than a fifth colour.
const BAND_CLASS: Record<LetterGrade | "NONE", string> = {
  ...GRADE_BAND_CLASS,
  NONE: "border border-dashed border-border bg-transparent text-muted-foreground",
};

// One 22px chip per subject, letter grade inside it, colour standing in for
// "how's this subject going" at a glance. This is what replaced the wide,
// horizontally-scrolling one-column-per-subject table: eleven-plus headers
// like "Christian Religious Studies" and "Computer Studies / ICT" made the
// old table wider than most screens, and the last few subjects were only
// reachable by scrolling — invisible unless you thought to look. Colour is
// never the ONLY signal: every chip still shows the letter itself (or "–"
// when ungraded), and its native `title` gives the full subject name, score
// and grade on hover/focus for anyone who wants detail without opening the
// dialog.
function SubjectChip({ subject }: { subject: SubjectScore }) {
  const graded = subject.total !== null && subject.grade !== null;
  const label = graded
    ? `${subject.name}: ${subject.total}/100 (${subject.grade})`
    : `${subject.name}: not graded yet`;
  return (
    <span
      title={label}
      className={
        "flex size-[22px] shrink-0 items-center justify-center rounded text-[11px] font-semibold " +
        BAND_CLASS[graded ? subject.grade! : "NONE"]
      }
    >
      {graded ? subject.grade : "–"}
    </span>
  );
}

// The read-only "all subjects" overview used to spend one whole column per
// subject — Admission No. and Name plus eleven-plus subject columns plus
// Average and Grade, wider than the viewport on every screen it's been
// shown on. This replaces all of those subject columns with one "Performance"
// column: a compact row of chips (click/tap any of them, or anywhere in the
// row, to open the full breakdown). Editing still only happens on the
// single-subject view, same as before — this dialog is read-only, matching
// the page's own "leave All subjects for a read-only overview" copy.
export function SubjectBreakdown({
  studentId,
  studentName,
  admissionNo,
  subjects,
  average,
  letter,
}: {
  studentId: string;
  studentName: string;
  admissionNo: string;
  subjects: SubjectScore[];
  average: number | null;
  letter: LetterGrade | null;
}) {
  const gradedCount = subjects.filter((s) => s.total !== null).length;
  const summary = `View ${studentName}'s subject breakdown — ${gradedCount} of ${subjects.length} subjects graded, average ${average === null ? "not available" : `${average.toFixed(1)} (${letter})`}`;

  return (
    <Dialog>
      {/* The whole chip row is the trigger — a big, obvious hit target
          rather than a separate tiny "view" link buried at the end of the
          row. */}
      <DialogTrigger asChild>
        <button type="button" aria-label={summary} className="flex flex-wrap gap-1 rounded p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
          {subjects.map((s) => (
            <SubjectChip key={s.id} subject={s} />
          ))}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg text-left">
        <DialogHeader>
          <DialogTitle>{studentName}</DialogTitle>
          <DialogDescription>
            {admissionNo} — {gradedCount} of {subjects.length} subjects graded
            {average !== null && (
              <>
                {" "}
                — average <span className="font-medium text-foreground">{average.toFixed(1)}</span>{" "}
                ({letter})
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[45vh] overflow-y-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Grade</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 tabular-nums">{s.total ?? "—"}</td>
                  <td className="px-3 py-2">
                    {s.grade ? (
                      <span
                        className={
                          "inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-xs font-semibold " +
                          BAND_CLASS[s.grade]
                        }
                      >
                        {s.grade}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not graded</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm">
          <Link href={`/portal/admin/students/${studentId}`} className="text-brand hover:underline">
            View full profile →
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
