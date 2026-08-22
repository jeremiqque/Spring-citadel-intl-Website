import { firstParam } from "@/lib/search-params";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGradingConfig } from "@/lib/grading-settings";
import { FILTER_SELECT_CLASSNAME } from "@/lib/filter-select-class";
import { requireTeacher, teacherAssignments } from "@/lib/teacher";
import { parseTerm } from "@/lib/validation/id";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { TeacherGradeRow } from "./teacher-grade-row";
import { SubmitAllDrafts } from "./submit-all";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

/**
 * Teacher grade entry — the sheet.
 *
 * ── THE AUTHORISATION SHAPE OF THIS PAGE ───────────────────────────────────
 * The class and subject in the URL are client-supplied, so they are treated
 * as a REQUEST, never as permission. The page loads this teacher's own
 * assignments from their session, and then picks the URL's pair only if it
 * appears in that list. A ?class= pointing at a class they don't teach does
 * not 403 — it falls back to their first real assignment, because a teacher
 * mistyping a URL is far more likely than a teacher attacking one, and the
 * write path is guarded independently anyway (see actions.ts).
 *
 * Nothing on this page is the security boundary. teacherSaveGradeAction
 * re-derives the teacher from the session and re-checks the assignment on
 * every write, because a Server Action can be called without this page ever
 * having rendered.
 */
export default async function TeacherGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ pair?: string | string[]; term?: string | string[] }>;
}) {
  const raw = await searchParams;
  // See lib/search-params.ts — `pair` is `.split("|")`, which an array is not.
  const params = { pair: firstParam(raw.pair), term: firstParam(raw.term) };
  const { teacherId } = await requireTeacher();

  const [assignments, sessionSetting, termSetting, gradingConfig] = await Promise.all([
    teacherAssignments(teacherId),
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
    getGradingConfig(),
  ]);

  const currentSession = sessionSetting?.value ?? "";

  if (assignments.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Grade entry</h1>
        <p className="text-sm text-muted-foreground">
          You have no classes assigned yet. An administrator assigns classes and subjects
          from your staff profile — once they do, they appear here.
        </p>
      </div>
    );
  }

  // The URL's pair is honoured only if this teacher actually holds it.
  // One `pair` param rather than separate ?class=&?subject= because only the
  // combinations in `assignments` are meaningful — two independent params
  // would let a URL name a class and a subject that are each individually
  // valid for this teacher but not valid together.
  const [requestedClassId, requestedSubjectId] = (params.pair ?? "").split("|");
  const requested = assignments.find(
    (a) => a.classId === requestedClassId && a.subjectId === requestedSubjectId
  );
  const active = requested ?? assignments[0];

  // Parsed, not cast. `params.term as TermValue` is an unchecked assertion
  // that goes straight into a Prisma `where` — one stale or mistyped link
  // (?term=Term1) threw PrismaClientValidationError and replaced the whole
  // sheet with the error boundary. The class/subject pair above already falls
  // back rather than erroring; term now behaves the same way, which is the
  // right answer for a value that only ever arrives from a link.
  const term: TermValue =
    parseTerm(params.term) ?? parseTerm(termSetting?.value) ?? "TERM_1";

  // Roster. INACTIVE students are excluded: a withdrawn child should not be
  // picking up new results, and their historical grades survive regardless
  // (Grade.student is onDelete: Restrict — removal is a soft delete).
  //
  // Not paginated, on purpose, unlike the admin's cross-class grades table:
  // one class is a bounded list (tens, not hundreds) and a teacher marking a
  // register needs to see the whole class at once. Two queries total,
  // regardless of class size — the roster, then every grade for it in one
  // batched read.
  const students = await prisma.student.findMany({
    where: { classId: active.classId, status: { in: ["ACTIVE", "AT_RISK"] } },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const grades = students.length
    ? await prisma.grade.findMany({
        where: {
          studentId: { in: students.map((s) => s.id) },
          subjectId: active.subjectId,
          term,
          session: currentSession,
        },
      })
    : [];

  const gradeByStudent = new Map(grades.map((g) => [g.studentId, g]));
  const draftCount = grades.filter((g) => g.status === "DRAFT").length;
  const submittedCount = grades.filter((g) => g.status === "SUBMITTED").length;
  const notEnteredCount = students.length - grades.length;

  function hrefForTerm(nextTerm: TermValue) {
    const sp = new URLSearchParams();
    sp.set("pair", `${active.classId}|${active.subjectId}`);
    sp.set("term", nextTerm);
    return `?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Grade entry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {active.class.name} — {active.subject.name}
          {currentSession ? ` · ${currentSession}` : ""} · {term.replace("_", " ")}
        </p>
      </div>

      {/* Plain GET form over native selects, matching the admin filter rows:
          every combination is a shareable, JS-free URL. The class/subject
          pair is one control rather than two, because only the pairs this
          teacher actually holds are valid — two independent selects would
          let them build a combination that does not exist and then explain
          an empty table. */}
      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="pair">
            Class and subject
          </label>
          <select
            id="pair"
            name="pair"
            defaultValue={`${active.classId}|${active.subjectId}`}
            className={FILTER_SELECT_CLASSNAME}
          >
            {assignments.map((a) => (
              <option key={a.id} value={`${a.classId}|${a.subjectId}`}>
                {a.class.name} — {a.subject.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="term">
            Term
          </label>
          <select id="term" name="term" defaultValue={term} className={FILTER_SELECT_CLASSNAME}>
            <option value="TERM_1">Term 1</option>
            <option value="TERM_2">Term 2</option>
            <option value="TERM_3">Term 3</option>
          </select>
        </div>
        <Button type="submit" variant="secondary" size="field">
          Open
        </Button>
      </form>

      {/* Term switching is one click rather than select-then-Open: a teacher
          moves between terms far more often than between classes. These look
          like tabs but are plain links, so the selected one needs a real
          signal beyond its background colour — aria-current="page" is what
          conveys it, matching the student results page and the sidebar. */}
      <div className="flex items-center gap-2">
        {(["TERM_1", "TERM_2", "TERM_3"] as const).map((t) => (
          <Link
            key={t}
            href={hrefForTerm(t)}
            aria-current={t === term ? "page" : undefined}
            className={
              "rounded-md px-3 py-1.5 text-xs transition-colors " +
              (t === term
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted")
            }
          >
            {t.replace("_", " ")}
          </Link>
        ))}
      </div>

      {currentSession === "" ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground"
        >
          <p className="font-medium">No academic session is set.</p>
          <p className="mt-1 text-muted-foreground">
            Grade entry is disabled until an administrator sets the current session, because
            every result is filed against one. Nothing you type below would be saved, so the
            sheet is read-only.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>{students.length} students</span>
          <span>{submittedCount} submitted</span>
          <span>{draftCount} draft{draftCount === 1 ? "" : "s"}</span>
          <span>{notEnteredCount} not entered</span>
        </div>
      )}

      <div className="rounded-lg border border-border">
        <Table caption={`Grade entry for ${active.class.name}, ${active.subject.name}, ${term.replace("_", " ")}`}>
          <TableHeader>
            <TableRow>
              <TableHead>Admission No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Assignment (0-20)</TableHead>
              <TableHead>Midterm (0-30)</TableHead>
              <TableHead>Exam (0-50)</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No students are enrolled in {active.class.name} yet.
                </TableCell>
              </TableRow>
            )}
            {students.map((s) => {
              const existing = gradeByStudent.get(s.id);
              return (
                <TeacherGradeRow
                  // The key includes the subject and term, not just the
                  // student. Switching term is a soft navigation that
                  // re-renders this tree in place, so React PRESERVES each
                  // row's useState while its `initial`/`term` props change
                  // underneath it: a teacher who typed 15/25/40 for Term 1
                  // and clicked the Term 2 tab before saving kept those
                  // numbers on screen, and one click of Save filed Term 1's
                  // marks as a Term 2 result. Same bug when only the subject
                  // changed, since the roster (and therefore the student ids)
                  // is identical. Changing the key remounts the row, which is
                  // what resets the typed state. `session` is in here for the
                  // same reason, for the rarer case of an admin rolling the
                  // academic session while a sheet is open.
                  key={`${s.id}:${active.subjectId}:${term}:${currentSession}`}
                  studentId={s.id}
                  studentName={s.user.name}
                  admissionNo={s.admissionNo}
                  classId={active.classId}
                  subjectId={active.subjectId}
                  term={term}
                  session={currentSession}
                  gradingConfig={gradingConfig}
                  initial={
                    existing
                      ? {
                          assignment: existing.assignment,
                          midterm: existing.midterm,
                          exam: existing.exam,
                          status: existing.status,
                        }
                      : null
                  }
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      {currentSession !== "" && students.length > 0 && (
        <SubmitAllDrafts
          classId={active.classId}
          subjectId={active.subjectId}
          term={term}
          session={currentSession}
          draftCount={draftCount}
          className={active.class.name}
          subjectName={active.subject.name}
        />
      )}
    </div>
  );
}
