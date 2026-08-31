import { firstParam } from "@/lib/search-params";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon } from "@hugeicons/core-free-icons";

import { prisma } from "@/lib/prisma";
import { FilterSelect } from "@/components/ui/filter-select";
import { parseTerm } from "@/lib/validation/id";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Surface, EmptyState } from "@/components/ui/surface";
import { Segmented } from "@/components/ui/segmented";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { AdminPsychomotorRow } from "./admin-psychomotor-row";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

// The admin twin of admin/grades/page.tsx, one class at a time rather than
// cross-class — psychomotor ratings are entered per class by that class's
// form teacher, so "every class at once" isn't a view anyone actually needs
// the way the cross-class grades table is (that one exists to audit
// submission progress across the whole school at a glance; this one exists
// to let an admin stand in for, or correct, one form teacher).
export default async function AdminPsychomotorPage({
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
        <PageHeader title="Psychomotor ratings" />
        <Surface padding="none">
          <EmptyState icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />} title="No classes exist yet">
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

  const ratings = students.length
    ? await prisma.psychomotorRating.findMany({
        where: { studentId: { in: students.map((s) => s.id) }, term, session: currentSession },
      })
    : [];
  const ratingByStudent = new Map(ratings.map((r) => [r.studentId, r]));

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
        title="Psychomotor ratings"
        description={
          activeClass.formTeacherId ? activeClass.name : `${activeClass.name} — no form teacher assigned`
        }
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
            <FilterSelect
              id="class"
              name="class"
              defaultValue={activeClassId}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <Button type="submit" variant="secondary" size="field">
            Open
          </Button>
        </form>
      </Surface>

      <Surface padding="none">
        {students.length === 0 ? (
          <EmptyState icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />} title={`No students are enrolled in ${activeClass.name} yet`}>
            There is nothing to rate until students are enrolled into this class.
          </EmptyState>
        ) : (
          <Table caption={`Psychomotor ratings for ${activeClass.name}, ${termLabel}`}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Admission No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Punct.</TableHead>
                <TableHead>Neat.</TableHead>
                <TableHead>Honesty</TableHead>
                <TableHead>Leader.</TableHead>
                <TableHead>Coop.</TableHead>
                <TableHead>Handw.</TableHead>
                <TableHead>Sports</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const existing = ratingByStudent.get(s.id);
                return (
                  <AdminPsychomotorRow
                    key={`${s.id}:${term}:${currentSession}`}
                    studentId={s.id}
                    studentName={s.user.name}
                    admissionNo={s.admissionNo}
                    classId={activeClassId}
                    term={term}
                    session={currentSession}
                    initial={
                      existing
                        ? {
                            punctuality: existing.punctuality,
                            neatness: existing.neatness,
                            honesty: existing.honesty,
                            leadership: existing.leadership,
                            cooperation: existing.cooperation,
                            handwriting: existing.handwriting,
                            sports: existing.sports,
                            remark: existing.remark,
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
