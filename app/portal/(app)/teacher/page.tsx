import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon, Alert02Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";

import { prisma } from "@/lib/prisma";
import { submissionStatusFromCounts, type SubmissionStatus } from "@/lib/grades";
import { requireTeacher, teacherAssignments } from "@/lib/teacher";
import { parseTerm } from "@/lib/validation/id";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Surface, SurfaceHeader, EmptyState } from "@/components/ui/surface";
import { Stat, StatGroup } from "@/components/ui/stat";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

function submissionBadge(status: SubmissionStatus): "success" | "warning" | "outline" {
  if (status === "Submitted") return "success";
  if (status === "In progress") return "warning";
  return "outline";
}

/**
 * Teacher dashboard.
 *
 * Answers the two questions a teacher opens the portal with: what have I
 * still not marked, and which of my students is in trouble.
 *
 * The per-assignment submission status uses submissionStatusFromCounts()
 * from lib/grades.ts — the same function the admin's teacher profile uses,
 * so "In progress" means the same thing on both screens. That function
 * predates this page; it was written during Package 5 specifically so it
 * would be correct the moment grade entry existed. This is that moment.
 *
 * Query shape: the counts are GROUPED, not per-assignment. The naive version
 * of this page is a Promise.all over assignments issuing two counts each —
 * a teacher with twelve pairs would fire 24 concurrent queries into a
 * connection pool five to nine wide on a serverless instance, and queue on
 * itself. Cost here is flat regardless of how many classes they hold.
 */
export default async function TeacherDashboardPage() {
  const { teacherId, name } = await requireTeacher();

  const [assignments, sessionSetting, termSetting] = await Promise.all([
    teacherAssignments(teacherId),
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
  ]);

  const currentSession = sessionSetting?.value ?? "";
  // Parsed, not cast: this value goes straight into a Prisma `where`, so a
  // hand-edited Setting row would throw and blank the dashboard.
  const currentTerm: TermValue = parseTerm(termSetting?.value) ?? "TERM_1";
  const classIds = [...new Set(assignments.map((a) => a.classId))];

  const [studentCounts, submittedThisTerm, atRiskStudents, atRiskTotal] = await Promise.all([
    classIds.length
      ? prisma.student.groupBy({
          by: ["classId"],
          where: { classId: { in: classIds }, status: { in: ["ACTIVE", "AT_RISK"] } },
          _count: { _all: true },
        })
      : Promise.resolve([] as { classId: string; _count: { _all: number } }[]),
    classIds.length && currentSession
      ? prisma.grade.groupBy({
          by: ["classId", "subjectId"],
          where: {
            teacherId,
            classId: { in: classIds },
            session: currentSession,
            term: currentTerm,
            status: "SUBMITTED",
          },
          _count: { _all: true },
        })
      : Promise.resolve([] as { classId: string; subjectId: string; _count: { _all: number } }[]),
    // Bounded. A teacher across ten classes could otherwise pull hundreds of
    // rows with two joins each and render every one with no pagination.
    classIds.length
      ? prisma.student.findMany({
          where: { classId: { in: classIds }, status: "AT_RISK" },
          include: { user: { select: { name: true } }, class: { select: { name: true } } },
          orderBy: { user: { name: "asc" } },
          take: 10,
        })
      : Promise.resolve([]),
    classIds.length
      ? prisma.student.count({ where: { classId: { in: classIds }, status: "AT_RISK" } })
      : Promise.resolve(0),
  ]);

  const studentsByClass = new Map(studentCounts.map((r) => [r.classId, r._count._all]));
  const submittedByPair = new Map(
    submittedThisTerm.map((r) => [`${r.classId}:${r.subjectId}`, r._count._all])
  );

  const rows = assignments.map((a) => {
    const studentCount = studentsByClass.get(a.classId) ?? 0;
    const submittedCount = submittedByPair.get(`${a.classId}:${a.subjectId}`) ?? 0;
    return {
      id: a.id,
      classId: a.classId,
      subjectId: a.subjectId,
      className: a.class.name,
      subjectName: a.subject.name,
      studentCount,
      submittedCount,
      status: submissionStatusFromCounts(studentCount, submittedCount),
    };
  });

  const outstanding = rows.filter((r) => r.status !== "Submitted").length;

  const totalStudents = rows.reduce((n, r) => n + r.studentCount, 0);

  return (
    <div className="space-y-6">
      {/* The greeting is the h1 but not the information. What a teacher needs
          in the first second is the session/term they are looking at and how
          much is left — the eyebrow and the tiles carry that, so the title
          can stay a greeting rather than trying to be a status line too. */}
      <PageHeader
        eyebrow={`${currentSession ? `${currentSession} · ` : ""}${currentTerm.replace("_", " ")}`}
        title={`Welcome, ${name}`}
        description={
          assignments.length > 0
            ? outstanding > 0
              ? `${outstanding} of ${assignments.length} class-subject${assignments.length === 1 ? "" : "s"} still to finish this term.`
              : "Everything you teach is marked and submitted for this term."
            : undefined
        }
        actions={
          assignments.length > 0 ? (
            <Button asChild size="field" variant="secondary">
              <Link href="/portal/teacher/classes">View my classes</Link>
            </Button>
          ) : undefined
        }
      />

      {currentSession === "" && (
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
                Grade entry is disabled until an administrator sets the current session. Your
                classes are listed below, but nothing can be recorded against them yet.
              </p>
            </div>
          </div>
        </Surface>
      )}

      {assignments.length > 0 && (
        <StatGroup>
          <Stat label="Class-subjects" value={assignments.length} />
          <Stat label="Students" value={totalStudents} />
          <Stat
            label="Still to finish"
            value={outstanding}
            tone={outstanding > 0 ? "warning" : "success"}
            hint={`of ${assignments.length}`}
          />
          <Stat label="At risk" value={atRiskTotal} tone={atRiskTotal > 0 ? "danger" : "neutral"} />
        </StatGroup>
      )}

      <Surface padding="none">
        <section>
          <SurfaceHeader>
            <h2 className="text-lg leading-heading font-semibold text-foreground">My classes</h2>
            <span className="text-xs text-muted-foreground">
              {assignments.length} class-subject{assignments.length === 1 ? "" : "s"} this term
            </span>
          </SurfaceHeader>
          {assignments.length === 0 ? (
            <EmptyState
              icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />}
              title="No classes assigned yet"
            >
              An administrator assigns classes and subjects from your staff profile.
            </EmptyState>
          ) : (
            <Table caption={`Assigned classes for ${currentTerm.replace("_", " ")}`}>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Grade entry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-5 font-medium text-foreground">
                      {r.className}
                    </TableCell>
                    <TableCell>{r.subjectName}</TableCell>
                    <TableCell data-numeric>{r.studentCount}</TableCell>
                    <TableCell data-numeric className="text-muted-foreground">
                      <span className="font-medium text-foreground">{r.submittedCount}</span> /{" "}
                      {r.studentCount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={submissionBadge(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {/* Was a bare blue text link in a row of plain text —
                          the one action on the row, styled as the least
                          prominent thing in it. A real button, and outlined
                          rather than filled once the class is done, so the
                          rows that still need work are the ones that pull. */}
                      <Button
                        asChild
                        size="sm"
                        variant={r.status === "Submitted" ? "outline" : "default"}
                      >
                        <Link
                          href={`/portal/teacher/grades?pair=${r.classId}|${r.subjectId}&term=${currentTerm}`}
                        >
                          {r.status === "Submitted" ? "Review" : "Enter grades"}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </Surface>

      <Surface padding="none">
        <section>
          <SurfaceHeader>
            <h2 className="text-lg leading-heading font-semibold text-foreground">
              At-risk students
            </h2>
            {atRiskTotal > 0 && (
              <Badge variant="destructive">
                {atRiskTotal} in my classes
              </Badge>
            )}
          </SurfaceHeader>
          {atRiskStudents.length === 0 ? (
            /* "None right now" was a single grey sentence hanging under a
               heading, which reads like something failed to load. An empty
               state with a positive icon says the same thing as an outcome
               rather than an absence. */
            <EmptyState
              icon={
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={18}
                  className="text-green-600"
                />
              }
              title="No students at risk right now"
            >
              Students are flagged automatically as results are submitted. Nobody in your
              classes is flagged today.
            </EmptyState>
          ) : (
            <Table caption="At-risk students in my classes">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Name</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead className="pr-5">Class</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRiskStudents.map((s) => (
                  <TableRow key={s.id}>
                    {/* Deliberately NOT a link. There is no teacher-facing
                        student profile, and /portal/admin/students/[id] is
                        role-gated — linking there would bounce every teacher
                        back to this dashboard. A name and a class is what a
                        teacher needs to go and find the child. */}
                    <TableCell className="pl-5 font-medium text-foreground">
                      {s.user.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {s.admissionNo}
                    </TableCell>
                    <TableCell className="pr-5">{s.class.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {atRiskTotal > atRiskStudents.length && (
            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              Showing {atRiskStudents.length} of {atRiskTotal}.
            </p>
          )}
        </section>
      </Surface>
    </div>
  );
}
