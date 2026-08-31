import { firstParam } from "@/lib/search-params";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon, Alert02Icon } from "@hugeicons/core-free-icons";

import { prisma } from "@/lib/prisma";
import { getGradingConfig } from "@/lib/grading-settings";
import { FILTER_SELECT_CLASSNAME } from "@/lib/filter-select-class";
import { requireTeacher, teacherAssignments } from "@/lib/teacher";
import { parseTerm } from "@/lib/validation/id";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Surface, SurfaceHeader, EmptyState } from "@/components/ui/surface";
import { Segmented } from "@/components/ui/segmented";
import { Stat, StatGroup, ProgressMeter } from "@/components/ui/stat";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
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
 *
 * ── WHAT CHANGED IN THE LAYOUT, AND WHY ────────────────────────────────────
 * The screen used to stack FOUR unrelated control bands between the title and
 * the data: a filter form, a row of term tabs, a row of grey counts, and then
 * the table. Each sat directly on the page background with nothing grouping
 * it, so the eye had to cross four ambiguous strips to reach the one thing
 * the page is for. Worse, the term was settable in two different places — a
 * <select> inside the form AND the tab row beneath it — which are two
 * controls for one value that can visibly disagree with each other while the
 * form is unsubmitted.
 *
 *   • The controls are now ONE toolbar in a card. The term <select> is gone;
 *     the segmented control is the single term control, and the form carries
 *     the current term in a hidden input so switching class still lands on
 *     the term you were looking at. Every combination remains a plain GET
 *     URL that works with JavaScript off — that constraint drove the
 *     original native selects and is fully preserved.
 *
 *   • The counts became a meter plus tiles. "12 submitted, 3 drafts,
 *     25 not entered" is three numbers a teacher has to do arithmetic on to
 *     answer the only question they have — am I nearly done? The bar answers
 *     it before they read anything.
 *
 *   • The empty class no longer renders a nine-column table containing one
 *     apologetic row. A table with headers for nine columns of nothing is a
 *     table pretending to have data; the empty state replaces it outright.
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
      <div className="space-y-6">
        <PageHeader title="Grade entry" />
        <Surface padding="none">
          <EmptyState
            icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />}
            title="No classes assigned yet"
          >
            An administrator assigns classes and subjects from your staff profile — once
            they do, they appear here.
          </EmptyState>
        </Surface>
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
  const termLabel = term.replace("_", " ");

  function hrefForTerm(nextTerm: TermValue) {
    const sp = new URLSearchParams();
    sp.set("pair", `${active.classId}|${active.subjectId}`);
    sp.set("term", nextTerm);
    return `?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${currentSession ? `${currentSession} · ` : ""}${termLabel}`}
        title="Grade entry"
        description={`${active.class.name} — ${active.subject.name}`}
        actions={
          <Segmented
            label="Term"
            items={(["TERM_1", "TERM_2", "TERM_3"] as const).map((t) => ({
              key: t,
              href: hrefForTerm(t),
              label: t.replace("_", " "),
              current: t === term,
            }))}
          />
        }
      />

      {/* Plain GET form over a native select: every class/subject combination
          stays a shareable, JS-free URL. The pair is ONE control rather than
          two, because only the pairs this teacher actually holds are valid —
          two independent selects would let them build a combination that
          does not exist and then explain an empty table.

          The term rides along in a hidden input so changing class keeps the
          term you were on. That is what lets the segmented control above be
          the only term control instead of the second of two. */}
      <Surface padding="sm">
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="term" value={term} />
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label
              className="text-2xs font-medium tracking-[0.08em] text-muted-foreground uppercase"
              htmlFor="pair"
            >
              Class and subject
            </label>
            <select
              id="pair"
              name="pair"
              defaultValue={`${active.classId}|${active.subjectId}`}
              className={`${FILTER_SELECT_CLASSNAME} w-full`}
            >
              {assignments.map((a) => (
                <option key={a.id} value={`${a.classId}|${a.subjectId}`}>
                  {a.class.name} — {a.subject.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary" size="field">
            Open
          </Button>
        </form>
      </Surface>

      {currentSession === "" ? (
        <Surface
          role="alert"
          padding="sm"
          className="border-destructive/30 bg-destructive/5 shadow-none"
        >
          <div className="flex gap-3">
            <HugeiconsIcon
              icon={Alert02Icon}
              size={18}
              className="mt-0.5 shrink-0 text-destructive"
              aria-hidden
            />
            <div className="text-sm">
              <p className="font-medium text-foreground">No academic session is set.</p>
              <p className="mt-1 leading-body text-muted-foreground">
                Grade entry is disabled until an administrator sets the current session,
                because every result is filed against one. Nothing you type below would be
                saved, so the sheet is read-only.
              </p>
            </div>
          </div>
        </Surface>
      ) : (
        students.length > 0 && (
          <Surface padding="none" className="overflow-hidden">
            <div className="px-5 pt-4">
              {/* Part-to-whole, in the order the work moves through:
                  submitted → draft → not entered. Every segment is restated
                  as a labelled tile below, so the colours are never the only
                  thing carrying the meaning. */}
              <ProgressMeter
                label={`Marking progress for ${active.class.name}, ${active.subject.name}, ${termLabel}`}
                total={students.length}
                segments={[
                  { value: submittedCount, tone: "success", label: "submitted" },
                  { value: draftCount, tone: "warning", label: "draft" },
                  { value: notEnteredCount, tone: "neutral", label: "not entered" },
                ]}
              />
            </div>
            <StatGroup className="mt-4 rounded-none border-0 border-t border-border">
              <Stat label="Students" value={students.length} />
              <Stat label="Submitted" value={submittedCount} tone="success" />
              <Stat label="Drafts" value={draftCount} tone="warning" />
              <Stat
                label="Not entered"
                value={notEnteredCount}
                tone={notEnteredCount > 0 ? "neutral" : "success"}
              />
            </StatGroup>
          </Surface>
        )
      )}

      <Surface padding="none">
        <SurfaceHeader
          actions={
            currentSession !== "" && students.length > 0 ? (
              <SubmitAllDrafts
                classId={active.classId}
                subjectId={active.subjectId}
                term={term}
                session={currentSession}
                draftCount={draftCount}
                className={active.class.name}
                subjectName={active.subject.name}
              />
            ) : undefined
          }
        >
          <div className="min-w-0">
            <h2 className="text-lg leading-heading font-semibold text-foreground">
              Student marks
            </h2>
            {/* The component weightings were only discoverable by reading
                three column headers. Stating them once, up here, is what
                lets those headers shorten later without losing the rule. */}
            <p className="mt-0.5 text-xs text-muted-foreground">
              Assignment 20 · Midterm 30 · Exam 50 — the total and letter update as you
              type.
            </p>
          </div>
        </SurfaceHeader>

        {students.length === 0 ? (
          <EmptyState
            icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />}
            title={`No students are enrolled in ${active.class.name} yet`}
          >
            There is nothing to mark until an administrator enrols students into this class.
          </EmptyState>
        ) : (
          <Table
            caption={`Grade entry for ${active.class.name}, ${active.subject.name}, ${termLabel}`}
          >
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Admission No.</TableHead>
                <TableHead>Name</TableHead>
                {/* The "(0-20)" suffixes are gone from these three headers:
                    the weightings are stated once in the card header above,
                    and each input still carries the full bound in its
                    aria-label and its `max`. Nine columns plus two buttons a
                    row did not fit the content width — the Actions column,
                    the only interactive part of the row, was the part that
                    scrolled off. Roughly 90px reclaimed here is what brings
                    it back on screen. */}
                <TableHead>Assignment</TableHead>
                <TableHead>Midterm</TableHead>
                <TableHead>Exam</TableHead>
                {/* Total and Grade were two columns carrying one fact —
                    "81" and "A" are the same result twice, and a letter
                    without its score is not independently useful here. One
                    column, score with the letter beside it, is a column of
                    width back for the Actions the teacher actually clicks. */}
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
        )}
      </Surface>
    </div>
  );
}
