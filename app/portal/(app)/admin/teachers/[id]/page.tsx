import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { submissionStatusFromCounts } from "@/lib/grades";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { TeacherActions } from "./teacher-actions";
import { AssignmentManager } from "./assignment-manager";

function statusBadgeVariant(status: string): "success" | "warning" | "outline" {
  if (status === "ACTIVE") return "success";
  if (status === "ON_LEAVE") return "warning";
  return "outline"; // INACTIVE
}

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      user: true,
      primarySubject: true,
      assignments: {
        include: { class: true, subject: true },
        orderBy: { class: { name: "asc" } },
      },
    },
  });
  if (!teacher) notFound();

  const [currentSessionSetting, currentTermSetting, allSubjects, allClasses] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: { gradingEnabled: true }, orderBy: [{ level: "asc" }, { name: "asc" }] }),
  ]);

  const currentSession = currentSessionSetting?.value;
  const currentTerm = currentTermSetting?.value;

  // Submission status per assignment: no grade-entry UI exists yet
  // (that's a later package), so every assignment currently reads "Not
  // started" — this logic is here now so it's correct the moment grades
  // start getting entered, not bolted on afterwards.
  // Three grouped queries instead of three per assignment.
  //
  // This was a textbook N+1: student.count + two grade.count, inside a
  // Promise.all over every assignment. A teacher with twelve (class, subject)
  // pairs fired 36 concurrent queries from a single render into a connection
  // pool that is five to nine wide on a serverless instance — one page
  // request queueing on its own pool. The counts are now grouped once and
  // read from Maps, so the cost is flat regardless of how many classes the
  // teacher holds.
  const classIds = [...new Set(teacher.assignments.map((a) => a.classId))];

  const [studentCounts, submittedThisTerm, submittedEver] = await Promise.all([
    prisma.student.groupBy({
      by: ["classId"],
      where: { classId: { in: classIds }, status: { in: ["ACTIVE", "AT_RISK"] } },
      _count: { _all: true },
    }),
    currentSession && currentTerm
      ? prisma.grade.groupBy({
          by: ["classId", "subjectId"],
          where: {
            teacherId: teacher.id,
            classId: { in: classIds },
            session: currentSession,
            term: currentTerm as "TERM_1" | "TERM_2" | "TERM_3",
            status: "SUBMITTED",
          },
          _count: { _all: true },
        })
      : Promise.resolve([] as { classId: string; subjectId: string; _count: { _all: number } }[]),
    prisma.grade.groupBy({
      by: ["classId", "subjectId"],
      where: { teacherId: teacher.id, classId: { in: classIds }, status: "SUBMITTED" },
      _count: { _all: true },
    }),
  ]);

  const studentsByClass = new Map(studentCounts.map((r) => [r.classId, r._count._all]));
  const thisTermByPair = new Map(
    submittedThisTerm.map((r) => [`${r.classId}:${r.subjectId}`, r._count._all])
  );
  const everByPair = new Map(
    submittedEver.map((r) => [`${r.classId}:${r.subjectId}`, r._count._all])
  );

  const assignmentDetails = teacher.assignments.map((a) => {
    const pair = `${a.classId}:${a.subjectId}`;
    const studentCount = studentsByClass.get(a.classId) ?? 0;
    const submittedCount = thisTermByPair.get(pair) ?? 0;
    const everSubmittedCount = everByPair.get(pair) ?? 0;

    const submissionStatus = submissionStatusFromCounts(studentCount, submittedCount);

    return {
      id: a.id,
      classId: a.classId,
      subjectId: a.subjectId,
      className: a.class.name,
      subjectName: a.subject.name,
      studentCount,
      submittedCount,
      submissionStatus,
      hasSubmittedGradesEver: everSubmittedCount > 0,
    };
  });

  // At-risk students across every class this teacher is assigned to.
  // `classIds` is already derived above for the grouped counts — this used to
  // redeclare it.
  //
  // Bounded: this had no `take`, so a teacher across ten classes could pull
  // 400 rows with two joins each and render every one of them with no
  // pagination. Twenty is a glanceable list; the count tells them if there
  // are more.
  const [atRiskStudents, atRiskTotal] = classIds.length
    ? await Promise.all([
        prisma.student.findMany({
          where: { classId: { in: classIds }, status: "AT_RISK" },
          include: { user: true, class: true },
          orderBy: { user: { name: "asc" } },
          take: 20,
        }),
        prisma.student.count({ where: { classId: { in: classIds }, status: "AT_RISK" } }),
      ])
    : [[], 0];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{teacher.user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {teacher.staffId}
            {teacher.primarySubject ? ` — ${teacher.primarySubject.name}` : ""}
          </p>
        </div>
        <Badge variant={statusBadgeVariant(teacher.status)}>{teacher.status.replace("_", " ")}</Badge>
      </div>

      <TeacherActions teacherId={teacher.id} status={teacher.status} />

      <section className="max-w-md rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-medium text-foreground">Staff info</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{teacher.phone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Gender</dt>
            <dd className="capitalize">{teacher.gender.toLowerCase()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Primary subject</dt>
            <dd>{teacher.primarySubject?.name ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground">
          Assigned classes ({teacher.assignments.length})
        </h2>
        <AssignmentManager
          teacherId={teacher.id}
          assignments={assignmentDetails}
          classes={allClasses.map((c) => ({ id: c.id, name: c.name, level: c.level }))}
          subjects={allSubjects.map((s) => ({ id: s.id, name: s.name, levels: s.levels }))}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground">
          At-risk students in their classes ({atRiskTotal})
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
                    <TableCell>
                      <Link href={`/portal/admin/students/${s.id}`} className="hover:underline">
                        {s.user.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                    <TableCell>{s.class.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
