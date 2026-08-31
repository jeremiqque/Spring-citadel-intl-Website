import { firstParam } from "@/lib/search-params";
import { HugeiconsIcon } from "@hugeicons/react";
import { Award01Icon } from "@hugeicons/core-free-icons";

import { prisma } from "@/lib/prisma";
import { FILTER_SELECT_CLASSNAME } from "@/lib/filter-select-class";
import { parseTerm } from "@/lib/validation/id";
import { checkCompileReadiness } from "@/lib/term-result";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Surface, EmptyState } from "@/components/ui/surface";
import { Segmented } from "@/components/ui/segmented";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { CompileAndPublish } from "./compile-publish";
import { RemarkEditor } from "./remark-editor";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

/**
 * Termly result compilation — Phase 2. One class/term at a time, same shape
 * as admin/psychomotor/page.tsx: compiling and publishing are things an
 * admin does per class, not across the whole school in one action, so a
 * cross-class table isn't the view this needs.
 *
 * The three states a row can be in aren't three different queries — they're
 * read off a single TermResult row (or its absence): no row = never
 * compiled, status COMPILED = ready to review/publish, status PUBLISHED =
 * live. See lib/term-result.ts for how a row gets bounced from
 * COMPILED/PUBLISHED back to DRAFT the moment a grade underneath it changes.
 */
export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string | string[]; term?: string | string[] }>;
}) {
  const raw = await searchParams;
  const params = { class: firstParam(raw.class), term: firstParam(raw.term) };

  const [classes, sessionSetting, termSetting] = await Promise.all([
    prisma.class.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
  ]);

  const currentSession = sessionSetting?.value ?? "";

  if (classes.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Termly results" />
        <Surface padding="none">
          <EmptyState icon={<HugeiconsIcon icon={Award01Icon} size={18} />} title="No classes exist yet">
            Classes are created by the seed script.
          </EmptyState>
        </Surface>
      </div>
    );
  }

  const activeClassId = classes.some((c) => c.id === params.class) ? params.class! : classes[0].id;
  const activeClass = classes.find((c) => c.id === activeClassId)!;
  const term: TermValue = parseTerm(params.term) ?? parseTerm(termSetting?.value) ?? "TERM_1";
  const termLabel = term.replace("_", " ");

  const students = await prisma.student.findMany({
    where: { classId: activeClassId, status: { in: ["ACTIVE", "AT_RISK"] } },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const [results, readiness] = await Promise.all([
    students.length
      ? prisma.termResult.findMany({
          where: { studentId: { in: students.map((s) => s.id) }, term, session: currentSession },
        })
      : Promise.resolve([]),
    currentSession !== "" ? checkCompileReadiness(activeClassId, term, currentSession) : Promise.resolve(null),
  ]);

  const resultByStudent = new Map(results.map((r) => [r.studentId, r]));
  const compiledCount = results.filter((r) => r.status === "COMPILED").length;
  const publishedCount = results.filter((r) => r.status === "PUBLISHED").length;
  const draftCount = results.filter((r) => r.status === "DRAFT").length;

  function hrefForTerm(nextTerm: TermValue) {
    const sp = new URLSearchParams();
    sp.set("class", activeClassId);
    sp.set("term", nextTerm);
    return `?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${currentSession ? `${currentSession} · ` : ""}${termLabel}`}
        title="Termly results"
        description={activeClass.name}
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

      <Surface padding="sm">
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="term" value={term} />
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label className="text-2xs font-medium tracking-[0.08em] text-muted-foreground uppercase" htmlFor="class">
              Class
            </label>
            <select id="class" name="class" defaultValue={activeClassId} className={`${FILTER_SELECT_CLASSNAME} w-full`}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
        <Surface role="alert" padding="sm" className="border-destructive/30 bg-destructive/5 shadow-none">
          <p className="text-sm font-medium text-foreground">No academic session is set.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Set the current session in Settings before compiling results.
          </p>
        </Surface>
      ) : (
        <Surface padding="sm">
          <CompileAndPublish
            classId={activeClassId}
            term={term}
            session={currentSession}
            className={activeClass.name}
            readyToCompile={readiness?.ready ?? false}
            blockedReason={readiness && !readiness.ready ? readiness.reason : undefined}
            compiledCount={compiledCount}
            draftCount={draftCount}
          />
          {publishedCount > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {publishedCount} of {students.length} already published for this term.
            </p>
          )}
        </Surface>
      )}

      <Surface padding="none">
        {students.length === 0 ? (
          <EmptyState icon={<HugeiconsIcon icon={Award01Icon} size={18} />} title={`No students are enrolled in ${activeClass.name} yet`}>
            There is nothing to compile until students are enrolled into this class.
          </EmptyState>
        ) : (
          <Table caption={`Termly results for ${activeClass.name}, ${termLabel}`}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Admission No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="pr-5">Report card</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const result = resultByStudent.get(s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="pl-5 font-mono text-xs text-muted-foreground">{s.admissionNo}</TableCell>
                    <TableCell className="font-medium text-foreground">{s.user.name}</TableCell>
                    <TableCell>{result ? result.average.toFixed(1) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {result?.position ? (
                        `${result.position} of ${result.classSize}`
                      ) : (
                        <span className="text-muted-foreground">
                          {activeClass.level === "SS" ? "Not ranked" : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!result ? (
                        <Badge variant="outline">Not compiled</Badge>
                      ) : result.status === "PUBLISHED" ? (
                        <Badge variant="success">Published</Badge>
                      ) : result.status === "COMPILED" ? (
                        <Badge variant="warning">Compiled</Badge>
                      ) : (
                        <Badge variant="destructive">Needs re-compile</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {result ? (
                        <RemarkEditor
                          studentId={s.id}
                          term={term}
                          session={currentSession}
                          classTeacherRemark={result.classTeacherRemark}
                          principalRemark={result.principalRemark}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Compile first</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-5">
                      {result?.status === "PUBLISHED" ? (
                        <Button asChild variant="outline" size="xs">
                          <a href={`/api/portal/report-card/${result.id}`}>Download</a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Publish first</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Surface>
    </div>
  );
}
