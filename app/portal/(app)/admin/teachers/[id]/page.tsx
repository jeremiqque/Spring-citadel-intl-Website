import { notFound } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Book01Icon,
  UserGroupIcon,
  BarChartIcon,
  Alert01Icon,
  IdentityCardIcon,
  Call02Icon,
  UserCircleIcon,
  BookOpen01Icon,
} from "@hugeicons/core-free-icons";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER } from "@/lib/user-select";
import { avatarUrl } from "@/lib/avatar";
import { Avatar } from "@/components/ui/avatar";
import { RemovePhotoButton } from "../../remove-photo-button";
import { BackLink } from "@/components/ui/back-link";
import { submissionStatusFromCounts } from "@/lib/grades";
import { Badge } from "@/components/ui/badge";
import { InfoCard, InfoRow } from "@/components/ui/info-card";
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

const TILE_COLOR = {
  green: { bg: "bg-green-100", text: "text-green-800" },
  amber: { bg: "bg-amber-100", text: "text-amber-800" },
  blue: { bg: "bg-blue-100", text: "text-blue-800" },
  neutral: { bg: "bg-muted", text: "text-muted-foreground" },
};

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
      user: PUBLIC_USER,
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
          include: { user: PUBLIC_USER, class: true },
          orderBy: { user: { name: "asc" } },
          take: 20,
        }),
        prisma.student.count({ where: { classId: { in: classIds }, status: "AT_RISK" } }),
      ])
    : [[], 0];

  const studentsTaught = [...studentsByClass.values()].reduce((sum, n) => sum + n, 0);
  const submittedAssignments = assignmentDetails.filter((a) => a.submissionStatus === "Submitted").length;
  const progressColor =
    assignmentDetails.length === 0
      ? TILE_COLOR.neutral
      : submittedAssignments === assignmentDetails.length
        ? TILE_COLOR.green
        : submittedAssignments > 0
          ? TILE_COLOR.amber
          : TILE_COLOR.neutral;

  return (
    <div className="space-y-8">
      <BackLink href="/portal/admin/teachers" label="Back to teachers" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            src={avatarUrl(teacher.user.id, teacher.user.avatarUpdatedAt)}
            name={teacher.user.name}
            size="lg"
            className="text-lg"
          />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{teacher.user.name}</h1>
            <p className="text-sm text-muted-foreground">
              {teacher.staffId}
              {teacher.primarySubject ? ` — ${teacher.primarySubject.name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={statusBadgeVariant(teacher.status)}>{teacher.status.replace("_", " ")}</Badge>
          {teacher.user.avatarUpdatedAt && (
            <RemovePhotoButton userId={teacher.user.id} personName={teacher.user.name} />
          )}
        </div>
      </div>

      <TeacherActions teacherId={teacher.id} status={teacher.status} />

      {/* Was a single "Staff info" box and nothing else above the fold —
          the same icon-chip KPI card used on the dashboard and the student
          profile, giving an admin the shape of this teacher's workload
          (how much they're covering, how many kids that touches, how much
          of this term's grading is actually in) without opening the
          assignment table below. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className={"flex size-6 items-center justify-center rounded-full " + TILE_COLOR.blue.bg}>
              <HugeiconsIcon icon={Book01Icon} size={16} className={TILE_COLOR.blue.text} />
            </span>
            <p className="text-sm font-medium text-foreground">Assigned classes</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">
            {teacher.assignments.length}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Class/subject pairs across {classIds.length} classes</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className={"flex size-6 items-center justify-center rounded-full " + TILE_COLOR.green.bg}>
              <HugeiconsIcon icon={UserGroupIcon} size={16} className={TILE_COLOR.green.text} />
            </span>
            <p className="text-sm font-medium text-foreground">Students taught</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">{studentsTaught}</p>
          <p className="mt-3 text-xs text-muted-foreground">Across their assigned classes</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className={"flex size-6 items-center justify-center rounded-full " + progressColor.bg}>
              <HugeiconsIcon icon={BarChartIcon} size={16} className={progressColor.text} />
            </span>
            <p className="text-sm font-medium text-foreground">Grading progress</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">
            {assignmentDetails.length === 0 ? "—" : `${submittedAssignments}/${assignmentDetails.length}`}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Assignments submitted this term</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className="flex size-6 items-center justify-center rounded-full bg-destructive/10">
              <HugeiconsIcon icon={Alert01Icon} size={16} className="text-destructive" />
            </span>
            <p className="text-sm font-medium text-foreground">At-risk students</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">{atRiskTotal}</p>
          <p className="mt-3 text-xs text-muted-foreground">In their assigned classes</p>
        </div>
      </section>

      <section className="max-w-md">
        <InfoCard icon={IdentityCardIcon} color="blue" title="Staff info">
          <InfoRow icon={Call02Icon} label="Phone" value={teacher.phone} />
          <InfoRow icon={UserCircleIcon} label="Gender" value={<span className="capitalize">{teacher.gender.toLowerCase()}</span>} />
          <InfoRow icon={BookOpen01Icon} label="Primary subject" value={teacher.primarySubject?.name ?? "—"} />
        </InfoCard>
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
