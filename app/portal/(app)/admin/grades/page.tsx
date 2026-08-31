import { firstParam } from "@/lib/search-params";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER } from "@/lib/user-select";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
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
import { FilterSelect, FILTER_ALL_VALUE } from "@/components/ui/filter-select";
import { parseTerm } from "@/lib/validation/id";
import { GradeEditRow } from "./grade-edit-row";
import { SubjectBreakdown } from "./subject-breakdown";

// Step 80: this is the page 600 seeded students has to stay under 2 seconds
// on. The design choice that makes that possible is right here — every
// query below scales with PAGE_SIZE (<=50), never with total enrolment:
// one paginated Student query, one batched Grade query (`studentId: {in:
// [...]}`), zero per-student round trips.
const PAGE_SIZE = 50;

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

export default async function AdminGradesPage({
  searchParams,
}: {
  searchParams: Promise<{
    class?: string | string[];
    subject?: string | string[];
    term?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
}) {
  const raw = await searchParams;
  // See lib/search-params.ts: a repeated query key arrives as an array, and
  // `subject` in particular is used verbatim as a Prisma `subjectId` filter.
  const params = {
    class: firstParam(raw.class),
    subject: firstParam(raw.subject),
    term: firstParam(raw.term),
    status: firstParam(raw.status),
    page: firstParam(raw.page),
  };

  const [currentSessionSetting, currentTermSetting, gradedClasses, gradingConfig] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
    prisma.class.findMany({ where: { gradingEnabled: true }, orderBy: [{ level: "asc" }, { name: "asc" }] }),
    getGradingConfig(),
  ]);

  const currentSession = currentSessionSetting?.value ?? "";

  if (gradedClasses.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Grades</h1>
        <p className="text-sm text-muted-foreground">No classes have grading enabled yet.</p>
      </div>
    );
  }

  // Parsed, not cast — see parseTerm's comment. `?term=Term1` from a stale
  // bookmark used to reach Prisma as an invalid enum and blow up the page.
  const term: TermValue =
    parseTerm(params.term) ?? parseTerm(currentTermSetting?.value) ?? "TERM_1";

  const classId =
    params.class && gradedClasses.some((c) => c.id === params.class) ? params.class : gradedClasses[0].id;
  const selectedClass = gradedClasses.find((c) => c.id === classId)!;

  const subjectId = params.subject && params.subject !== FILTER_ALL_VALUE ? params.subject : "";
  const statusParam = params.status && params.status !== FILTER_ALL_VALUE ? params.status : "";
  const page = Math.max(1, Number(params.page) || 1);

  const classSubjects = await prisma.subject.findMany({
    where: { levels: { has: selectedClass.level } },
    orderBy: { name: "asc" },
  });

  const studentWhere: Prisma.StudentWhereInput = { classId };
  if (statusParam === "ALL") {
    // no filter
  } else if (statusParam === "ACTIVE" || statusParam === "AT_RISK" || statusParam === "INACTIVE") {
    studentWhere.status = statusParam;
  } else {
    studentWhere.status = { in: ["ACTIVE", "AT_RISK"] };
  }

  const [students, totalStudents] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      include: { user: PUBLIC_USER },
      orderBy: { user: { name: "asc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.student.count({ where: studentWhere }),
  ]);

  const studentIds = students.map((s) => s.id);

  const grades = studentIds.length
    ? await prisma.grade.findMany({
        where: {
          studentId: { in: studentIds },
          term,
          session: currentSession,
          ...(subjectId ? { subjectId } : {}),
        },
      })
    : [];

  const gradesByStudent = new Map<string, typeof grades>();
  for (const g of grades) {
    const list = gradesByStudent.get(g.studentId) ?? [];
    list.push(g);
    gradesByStudent.set(g.studentId, list);
  }

  const totalPages = Math.max(1, Math.ceil(totalStudents / PAGE_SIZE));

  function buildHref(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    sp.set("class", classId);
    if (subjectId) sp.set("subject", subjectId);
    sp.set("term", term);
    if (statusParam) sp.set("status", statusParam);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    return `?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Grades</h1>

      {/* No tabs, per the PRD — one filterable table, GET form so every
          combination is a shareable URL. */}
      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="class">
            Class
          </label>
          <FilterSelect
            id="class"
            name="class"
            defaultValue={classId}
            options={gradedClasses.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="subject">
            Subject
          </label>
          <FilterSelect
            id="subject"
            name="subject"
            defaultValue={subjectId || FILTER_ALL_VALUE}
            options={[
              { value: FILTER_ALL_VALUE, label: "All subjects (view only)" },
              ...classSubjects.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="term">
            Term
          </label>
          <FilterSelect
            id="term"
            name="term"
            defaultValue={term}
            options={[
              { value: "TERM_1", label: "Term 1" },
              { value: "TERM_2", label: "Term 2" },
              { value: "TERM_3", label: "Term 3" },
            ]}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="status">
            Status
          </label>
          <FilterSelect
            id="status"
            name="status"
            defaultValue={statusParam || FILTER_ALL_VALUE}
            options={[
              { value: FILTER_ALL_VALUE, label: "Active (default)" },
              { value: "AT_RISK", label: "At risk" },
              { value: "INACTIVE", label: "Inactive" },
              { value: "ALL", label: "All" },
            ]}
          />
        </div>
        {/* Same "field" (h-9) size as the other two Apply buttons — see
            students/page.tsx's comment for why this exists. */}
        <Button type="submit" variant="secondary" size="field">
          Apply
        </Button>
      </form>

      {/* Surfaced as a real warning rather than the old "Session: not set"
          aside. Every grade is keyed on the session, so with none set the
          entry table is read-only — an admin needs to know that before typing
          fifty rows, not after clicking Save on the last one. */}
      {currentSession ? (
        <p className="text-xs text-muted-foreground">
          Session: {currentSession} — pick a single subject to edit scores; leave
          &quot;All subjects&quot; for a read-only overview across the whole class.
        </p>
      ) : (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground"
        >
          <p className="font-medium">No academic session is set.</p>
          <p className="mt-1 text-muted-foreground">
            Grade entry is disabled until the current session is set, because every result is
            filed against a session. Ask whoever administers the database to set the{" "}
            <code className="font-mono text-xs">currentSession</code> setting.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border">
        {subjectId ? (
          <Table caption={`Grade entry for ${selectedClass.name}, ${term.replace("_", " ")}`}>
            <TableHeader>
              <TableRow>
                <TableHead>Admission No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Assignment (0-20)</TableHead>
                <TableHead>Midterm (0-30)</TableHead>
                <TableHead>Exam (0-50)</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No students match these filters.
                  </TableCell>
                </TableRow>
              )}
              {students.map((s) => {
                const existing = gradesByStudent.get(s.id)?.[0];
                return (
                  <GradeEditRow
                    key={s.id}
                    studentId={s.id}
                    studentName={s.user.name}
                    admissionNo={s.admissionNo}
                    subjectId={subjectId}
                    classId={classId}
                    term={term}
                    session={currentSession}
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
        ) : (
          <Table caption={`All-subjects overview for ${selectedClass.name}, ${term.replace("_", " ")}`}>
            <TableHeader>
              <TableRow>
                <TableHead>Admission No.</TableHead>
                <TableHead>Name</TableHead>
                {/* Was one column per subject (11+ headers, wider than the
                    viewport on every screen it shipped on — the last few
                    subjects were only reachable by scrolling). "Performance"
                    is a compact chip strip instead; click it for the full
                    per-subject breakdown. See subject-breakdown.tsx. */}
                <TableHead>Performance</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No students match these filters.
                  </TableCell>
                </TableRow>
              )}
              {students.map((s) => {
                const studentGrades = gradesByStudent.get(s.id) ?? [];
                const scoresBySubject = new Map(studentGrades.map((g) => [g.subjectId, g]));
                const avg = average(studentGrades.map((g) => g.total));
                const letter = avg === null ? null : scoreToLetter(avg, gradingConfig);
                const subjectScores = classSubjects.map((sub) => {
                  const g = scoresBySubject.get(sub.id);
                  return {
                    id: sub.id,
                    name: sub.name,
                    total: g ? g.total : null,
                    grade: g ? scoreToLetter(g.total, gradingConfig) : null,
                  };
                });
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                    <TableCell>
                      <Link href={`/portal/admin/students/${s.id}`} className="hover:underline">
                        {s.user.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <SubjectBreakdown
                        studentId={s.id}
                        studentName={s.user.name}
                        admissionNo={s.admissionNo}
                        subjects={subjectScores}
                        average={avg}
                        letter={letter}
                      />
                    </TableCell>
                    <TableCell>{avg === null ? "—" : avg.toFixed(1)}</TableCell>
                    <TableCell>{letter ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Pagination
          page={page}
          totalPages={totalPages}
          hrefForPage={(p) => buildHref({ page: p > 1 ? String(p) : undefined })}
        />
    </div>
  );
}
