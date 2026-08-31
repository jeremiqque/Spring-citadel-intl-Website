import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Book01Icon, UserGroupIcon, Alert01Icon, Award01Icon } from "@hugeicons/core-free-icons";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER } from "@/lib/user-select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ClassCoverage, type ClassAssignment } from "./class-coverage";
import { FormTeacherPicker } from "./form-teacher-picker";
import { ClassForm } from "./class-form";
import { ClassDeleteButton } from "./class-delete-button";

const LEVEL_LABEL: Record<string, string> = {
  EARLY_YEARS: "Early Years",
  PRIMARY: "Primary",
  JSS: "Junior Secondary",
  SS: "Senior Secondary",
};

/**
 * Classes — add and delete are admin tasks now; editing an existing class
 * still is not, and never will be through this form.
 *
 * ── WHY EDITING STAYS OUT, EVEN THOUGH ADD/DELETE ARE IN ─────────────────
 * `Class.code` feeds the admission number ("SCIS/2026/JSS3/001", see
 * lib/ids.ts), and admission numbers go on paper records the school keeps for
 * years. An edit form over an EXISTING class would let one mistyped code
 * silently change the number every subsequent student in that class is
 * issued, with no relationship to the numbers already printed on the
 * admission letters of the children sitting in the same room. Creating a NEW
 * class doesn't have that problem — there's no history yet to contradict —
 * so ClassForm (see class-form.tsx) covers that, and deleteClassAction (see
 * actions.ts) refuses the moment a class has any student, grade, attendance
 * mark, psychomotor rating or term result on file, which is what makes
 * "delete and re-add" a safe way to fix a mistake made before anyone was
 * enrolled.
 *
 * `gradingEnabled` is the other trap ClassForm closes off rather than opens
 * up: it is derived from the level chosen (see gradingEnabledForLevel), not
 * offered as a free toggle — turning it on for Primary would hand teachers a
 * 20/30/50 marking sheet for a level the school has no agreed assessment
 * scheme for.
 *
 * "Who teaches them" was already not read-only: the Teachers column opens
 * the actual teacher/subject pairs for that class via ClassCoverage, and can
 * add or remove one right there — the same addAssignmentAction/
 * removeAssignmentAction the teacher profile and the Subjects page both
 * call.
 *
 * Query shape: five grouped queries total, not one per class.
 */
export default async function AdminClassesPage() {
  const [classes, studentCounts, atRiskCounts, assignments, allSubjects, allTeachers] = await Promise.all([
    prisma.class.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.student.groupBy({
      by: ["classId"],
      where: { status: { in: ["ACTIVE", "AT_RISK"] } },
      _count: { _all: true },
    }),
    prisma.student.groupBy({
      by: ["classId"],
      where: { status: "AT_RISK" },
      _count: { _all: true },
    }),
    prisma.teacherAssignment.findMany({
      // Only assignments whose teacher is still on the staff — an INACTIVE
      // teacher's rows survive (soft delete) and would otherwise be counted
      // as current cover for a class nobody is teaching. Full rows, not
      // just ids, now: ClassCoverage's dialog lists who's assigned, not
      // just how many.
      where: { teacher: { status: { in: ["ACTIVE", "ON_LEAVE"] } } },
      include: { teacher: { include: { user: PUBLIC_USER } }, subject: true },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.teacher.findMany({
      where: { status: { in: ["ACTIVE", "ON_LEAVE"] } },
      include: { user: PUBLIC_USER },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const studentsByClass = new Map(studentCounts.map((r) => [r.classId, r._count._all]));
  const atRiskByClass = new Map(atRiskCounts.map((r) => [r.classId, r._count._all]));

  const subjectsByClass = new Map<string, Set<string>>();
  const assignmentsByClass = new Map<string, ClassAssignment[]>();
  for (const a of assignments) {
    if (!subjectsByClass.has(a.classId)) subjectsByClass.set(a.classId, new Set());
    if (!assignmentsByClass.has(a.classId)) assignmentsByClass.set(a.classId, []);
    subjectsByClass.get(a.classId)!.add(a.subjectId);
    assignmentsByClass.get(a.classId)!.push({
      id: a.id,
      teacherId: a.teacherId,
      teacherName: a.teacher.user.name,
      subjectId: a.subjectId,
      subjectName: a.subject.name,
    });
  }

  const teacherOptions = allTeachers.map((t) => ({ id: t.id, name: t.user.name }));

  const totalStudents = studentCounts.reduce((n, r) => n + r._count._all, 0);
  const totalAtRisk = atRiskCounts.reduce((n, r) => n + r._count._all, 0);
  const gradingEnabledCount = classes.filter((c) => c.gradingEnabled).length;

  // Rows grouped under a level header instead of one flat list of 16 —
  // `classes` is already sorted by level then name, so this is a single pass
  // that inserts a header whenever the level changes. Without it, four
  // Early Years/Primary rows of nothing-but-zeros sat directly above the
  // Junior/Senior Secondary rows where every number actually means
  // something, and the two read as one undifferentiated block.
  let lastLevel: string | null = null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {classes.length} classes · {totalStudents} enrolled students
          </p>
        </div>
        <ClassForm trigger={<Button size="sm">Add class</Button>} />
      </div>

      {/* Same icon-chip KPI card the dashboard and student profile already
          use — the page previously had no summary at all, just the subtitle
          line above and then straight into a 16-row table. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className="flex size-6 items-center justify-center rounded-full bg-blue-100">
              <HugeiconsIcon icon={Book01Icon} size={16} className="text-blue-800" />
            </span>
            <p className="text-sm font-medium text-foreground">Classes</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">{classes.length}</p>
          <p className="mt-3 text-xs text-muted-foreground">Across every level, Early Years to SS3</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className="flex size-6 items-center justify-center rounded-full bg-green-100">
              <HugeiconsIcon icon={UserGroupIcon} size={16} className="text-green-800" />
            </span>
            <p className="text-sm font-medium text-foreground">Enrolled students</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">{totalStudents}</p>
          <p className="mt-3 text-xs text-muted-foreground">Active and at-risk, across all classes</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className="flex size-6 items-center justify-center rounded-full bg-destructive/10">
              <HugeiconsIcon icon={Alert01Icon} size={16} className="text-destructive" />
            </span>
            <p className="text-sm font-medium text-foreground">At-risk students</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">{totalAtRisk}</p>
          <p className="mt-3 text-xs text-muted-foreground">Flagged by term average, across all classes</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className="flex size-6 items-center justify-center rounded-full bg-violet-100">
              <HugeiconsIcon icon={Award01Icon} size={16} className="text-violet-800" />
            </span>
            <p className="text-sm font-medium text-foreground">Grading enabled</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">
            {gradingEnabledCount}/{classes.length}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">JSS and SS levels, per the school's scheme</p>
        </div>
      </section>

      <div className="rounded-lg border border-border">
        <Table caption="All classes">
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>At risk</TableHead>
              <TableHead>Teachers</TableHead>
              <TableHead>Subjects covered</TableHead>
              <TableHead>Form teacher</TableHead>
              <TableHead>Grading</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  No classes yet. Add the first one to get started.
                </TableCell>
              </TableRow>
            )}
            {classes.map((c) => {
              const students = studentsByClass.get(c.id) ?? 0;
              const atRisk = atRiskByClass.get(c.id) ?? 0;
              const subjects = subjectsByClass.get(c.id)?.size ?? 0;
              const showLevelHeader = c.level !== lastLevel;
              lastLevel = c.level;
              return (
                <React.Fragment key={c.id}>
                  {showLevelHeader && (
                    <TableRow className="border-b-0 bg-muted/40 hover:bg-muted/40">
                      <TableCell
                        colSpan={10}
                        className="py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                      >
                        {LEVEL_LABEL[c.level] ?? c.level}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell>
                      <Link
                        href={`/portal/admin/students?class=${c.id}`}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>{LEVEL_LABEL[c.level] ?? c.level}</TableCell>
                    <TableCell>{students}</TableCell>
                    {/* Plain zero, not a badge, when there are none — a row
                        of "0" chips reads as a wall of alerts at a glance. */}
                    <TableCell>
                      {atRisk === 0 ? (
                        <span className="text-muted-foreground">0</span>
                      ) : (
                        <Badge variant="destructive">{atRisk}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <ClassCoverage
                        classId={c.id}
                        className={c.name}
                        assignments={assignmentsByClass.get(c.id) ?? []}
                        subjects={allSubjects
                          .filter((s) => s.levels.includes(c.level))
                          .map((s) => ({ id: s.id, name: s.name }))}
                        teachers={teacherOptions}
                      />
                    </TableCell>
                    <TableCell>{subjects}</TableCell>
                    <TableCell>
                      <FormTeacherPicker
                        classId={c.id}
                        formTeacherId={c.formTeacherId}
                        teachers={teacherOptions}
                      />
                    </TableCell>
                    <TableCell>
                      {c.gradingEnabled ? (
                        <Badge variant="success">Enabled</Badge>
                      ) : (
                        <Badge variant="outline">Not graded</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <ClassDeleteButton classId={c.id} className={c.name} />
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        A class&apos;s code and level can&apos;t be changed after it&apos;s added — the code feeds
        every admission number issued to that class (
        <span className="font-mono">SCIS/2026/JSS3/001</span>), and those numbers go on paper
        records the school keeps for years. Delete only works before anyone has been enrolled
        into it, so fixing a mistake means deleting and re-adding rather than editing. Who
        teaches a class is different — open a class&apos;s teacher count to see or change its
        coverage.
      </p>
    </div>
  );
}
