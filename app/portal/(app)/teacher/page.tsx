import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { submissionStatusFromCounts, type SubmissionStatus } from "@/lib/grades";
import { requireTeacher, teacherAssignments } from "@/lib/teacher";
import { parseTerm } from "@/lib/validation/id";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome, {name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentSession ? `${currentSession} · ` : ""}
          {currentTerm.replace("_", " ")}
          {assignments.length > 0 &&
            ` · ${outstanding} of ${assignments.length} still to finish`}
        </p>
      </div>

      {currentSession === "" && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground"
        >
          <p className="font-medium">No academic session is set.</p>
          <p className="mt-1 text-muted-foreground">
            Grade entry is disabled until an administrator sets the current session. Your
            classes are listed below, but nothing can be recorded against them yet.
          </p>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground">
          My classes ({assignments.length})
        </h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have no classes assigned yet. An administrator assigns classes and subjects
            from your staff profile.
          </p>
        ) : (
          <div className="rounded-lg border border-border">
            <Table caption={`Assigned classes for ${currentTerm.replace("_", " ")}`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Grade entry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.className}</TableCell>
                    <TableCell>{r.subjectName}</TableCell>
                    <TableCell>{r.studentCount}</TableCell>
                    <TableCell>
                      {r.submittedCount} / {r.studentCount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={submissionBadge(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/portal/teacher/grades?pair=${r.classId}|${r.subjectId}&term=${currentTerm}`}
                        className="text-brand hover:underline"
                      >
                        Enter grades
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground">
          At-risk students in my classes ({atRiskTotal})
        </h2>
        {atRiskStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground">None right now.</p>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Class</TableHead>
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
                    <TableCell>{s.user.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                    <TableCell>{s.class.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {atRiskTotal > atRiskStudents.length && (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {atRiskStudents.length} of {atRiskTotal}.
          </p>
        )}
      </section>
    </div>
  );
}
