import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  TeacherIcon,
  BarChartIcon,
  PencilEdit01Icon,
  CheckmarkCircle02Icon,
  Alert01Icon,
  HistoryIcon,
  NotificationCircleIcon,
} from "@hugeicons/core-free-icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER } from "@/lib/user-select";
import { average, scoreToLetter } from "@/lib/grading";
import { getGradingConfig } from "@/lib/grading-settings";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Figma node 4068:97 ("Dashboard") — colored icon chip + label + timestamp
// per notification type, matching how the notification bell's own list
// distinguishes them.
//
// Colors: two of these chips (green/red) map onto real semantic meaning
// this app already has tokens for (Badge's success/destructive), so they
// reuse those exact pairs. The other two (Teachers/purple, Grades
// Submitted/amber) don't correspond to anything semantic — they're just
// visually distinct categories — so rather than inventing a bespoke token
// for "purple" and "orange", they reuse Tailwind's stock 100/800 pairing
// the same way Badge's own success/warning variants do. Amber for Grades
// Submitted happens to be the exact pair Badge's "warning" variant already
// uses. This is a judgment call, not a hidden decision — flagged as such.
const ACTIVITY_STYLE: Record<string, { bg: string; icon: typeof UserGroupIcon }> = {
  STUDENT_ENROLLED: { bg: "bg-green-100", icon: UserGroupIcon },
  STUDENT_AT_RISK: { bg: "bg-destructive/10", icon: Alert01Icon },
  // GRADES_SUBMITTED and GRADES_PUBLISHED were identical in BOTH colour and
  // icon — two distinct events rendering as the same chip, so the feed could
  // not tell you which had happened. Submitted is work in progress (pencil,
  // amber, the same pair Badge's "warning" uses); published is a completed
  // state (checkmark, violet).
  GRADES_SUBMITTED: { bg: "bg-amber-100", icon: PencilEdit01Icon },
  GRADES_PUBLISHED: { bg: "bg-violet-100", icon: CheckmarkCircle02Icon },
};

function timeAgo(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function AdminDashboardPage() {
  const session = await auth();

  const [currentSessionSetting, currentTermSetting, gradingConfig] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
    // Same round trip as the two settings above — the letters in the recent
    // students table are banded from an average, so they need the live bands.
    getGradingConfig(),
  ]);
  const currentSession = currentSessionSetting?.value;
  const currentTerm = currentTermSetting?.value as "TERM_1" | "TERM_2" | "TERM_3" | undefined;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Steps 74-76: four KPIs + a distribution, each backed by an aggregate
  // query rather than a loop over rows — this is what keeps the dashboard
  // fast regardless of how many students the school ends up with.
  const [
    totalStudents,
    totalTeachers,
    atRiskCount,
    gradesSubmittedToday,
    gradeDistribution,
    recentStudents,
    recentActivity,
  ] = await Promise.all([
    prisma.student.count({ where: { status: { in: ["ACTIVE", "AT_RISK"] } } }),
    prisma.teacher.count({ where: { status: { in: ["ACTIVE", "ON_LEAVE"] } } }),
    prisma.student.count({ where: { status: "AT_RISK" } }),
    prisma.grade.count({ where: { status: "SUBMITTED", submittedAt: { gte: startOfToday } } }),
    currentSession && currentTerm
      ? prisma.grade.groupBy({
          by: ["grade"],
          where: { session: currentSession, term: currentTerm, status: "SUBMITTED" },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    prisma.student.findMany({
      where: { status: { in: ["ACTIVE", "AT_RISK"] } },
      include: { user: PUBLIC_USER, class: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // Package 7's Notification rows, scoped to this admin's own userId — same
    // "no cross-user reads" pattern as everywhere else, not a special case.
    session?.user?.id
      ? prisma.notification.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),
  ]);

  const distributionByLetter = new Map(gradeDistribution.map((g) => [g.grade, g._count._all]));
  const totalGraded = gradeDistribution.reduce((sum, g) => sum + g._count._all, 0);

  // Per-student current-term average for the recent-students table — bounded
  // to the 10 rows already fetched above, so this is one extra batched query,
  // not a per-row round trip.
  const recentGrades = currentSession && currentTerm && recentStudents.length
    ? await prisma.grade.findMany({
        where: {
          studentId: { in: recentStudents.map((s) => s.id) },
          term: currentTerm,
          session: currentSession,
          status: "SUBMITTED",
        },
        select: { studentId: true, total: true },
      })
    : [];
  const gradesByStudent = new Map<string, number[]>();
  for (const g of recentGrades) {
    const arr = gradesByStudent.get(g.studentId) ?? [];
    arr.push(g.total);
    gradesByStudent.set(g.studentId, arr);
  }

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Admin overview</h1>

      {/* Step 74 — KPI row, matching Figma's icon-chip + label + big number
          layout. Grades Submitted is "today" per the Figma copy — a
          different, narrower query than the Package 5 term-progress KPI it
          replaces here (still available in full on /portal/admin/grades).

          Cards use the same rounded-lg/border-border/bg-card/p-6 treatment
          as every other card in the app (StudentRecordMissing, the error
          and not-found cards) instead of their own one-off bg-white +
          hardcoded drop shadow — this is what actually lets .portal.dark
          take effect on them, and drops four distinct card-padding values
          in this file down to one. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className="flex size-6 items-center justify-center rounded-full bg-green-100">
              <HugeiconsIcon icon={UserGroupIcon} size={16} className="text-green-800" />
            </span>
            <p className="text-sm font-medium text-foreground">Total Students Enrolled</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">{totalStudents}</p>
          <p className="mt-3 text-xs text-muted-foreground">Live count of enrolled students this session</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className="flex size-6 items-center justify-center rounded-full bg-violet-100">
              <HugeiconsIcon icon={TeacherIcon} size={16} className="text-violet-800" />
            </span>
            <p className="text-sm font-medium text-foreground">Total Teachers on Staff</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">{totalTeachers}</p>
          <p className="mt-3 text-xs text-muted-foreground">Active teaching staff accounts in the system</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className="flex size-6 items-center justify-center rounded-full bg-amber-100">
              <HugeiconsIcon icon={BarChartIcon} size={16} className="text-amber-800" />
            </span>
            <p className="text-sm font-medium text-foreground">Grades Submitted</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">{gradesSubmittedToday}</p>
          <p className="mt-3 text-xs text-muted-foreground">Score entries recorded across all subjects today</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className="flex size-6 items-center justify-center rounded-full bg-destructive/10">
              <HugeiconsIcon icon={Alert01Icon} size={16} className="text-destructive" />
            </span>
            <p className="text-sm font-medium text-foreground">At-Risk Students</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">{atRiskCount}</p>
          {/* Real threshold, not Figma's copy — lib/grades.ts's placeholder
              rule is average < 45, still NOT YET CONFIRMED BY THE SCHOOL. */}
          <p className="mt-3 text-xs text-muted-foreground">
            Flagged automatically when term average drops below 45
          </p>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        {/* Recent students — a preview, not the full paginated list (that
            already exists at /portal/admin/students with real search/filter/
            pagination). "View all" goes there rather than duplicating it. */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={HistoryIcon} size={22} className="text-foreground" />
              <h2 className="text-base font-medium text-foreground">Recent students</h2>
            </div>
            {/* Both "View all" links on this page now share one treatment —
                previously this one was a bordered button-like link while
                the Live Activity Feed's was a plain text link. */}
            <Link href="/portal/admin/students" className="text-xs font-medium text-brand hover:underline">
              View all
            </Link>
          </div>

          {recentStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No students enrolled yet.</p>
          ) : (
            <>
              <Table caption="Most recently enrolled students">
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Students</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentStudents.map((s) => {
                    const totals = gradesByStudent.get(s.id) ?? [];
                    const avg = average(totals);
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Link href={`/portal/admin/students/${s.id}`} className="hover:underline">
                            {s.user.name}
                          </Link>
                        </TableCell>
                        <TableCell>{s.class.name}</TableCell>
                        <TableCell>{avg === null ? "—" : `${avg.toFixed(1)} (${scoreToLetter(avg, gradingConfig)})`}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === "AT_RISK" ? "destructive" : "success"} className="gap-1.5">
                            <span
                              className={
                                "size-[9px] rounded-full " + (s.status === "AT_RISK" ? "bg-destructive" : "bg-green-600")
                              }
                            />
                            {s.status === "AT_RISK" ? "At risk" : "Active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">
                Showing {recentStudents.length} most recently enrolled of {totalStudents} active students.
              </p>
            </>
          )}
        </section>

        <div className="flex flex-col gap-3">
          {/* Step 76 — grade distribution, no charting library, matching
              Figma's icon + label + percentage rows (percentages of
              submitted grades this term, not of the whole school). */}
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <HugeiconsIcon icon={BarChartIcon} size={22} className="text-foreground" />
              <h2 className="text-base font-medium text-foreground">Grade distribution</h2>
            </div>
            {totalGraded === 0 ? (
              <p className="text-sm text-muted-foreground">No grades submitted yet this term.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {[
                  { letter: "A" as const, label: "A (70 - 100)" },
                  { letter: "B" as const, label: "B (60 - 69)" },
                  { letter: "C" as const, label: "C (50 - 59)" },
                  { letter: "D" as const, label: "D/F (<50)", combineWithF: true },
                ].map((row) => {
                  const count =
                    (distributionByLetter.get(row.letter) ?? 0) +
                    (row.combineWithF ? distributionByLetter.get("F") ?? 0 : 0);
                  const pct = totalGraded > 0 ? Math.round((count / totalGraded) * 100) : 0;
                  return (
                    <div key={row.letter} className="flex items-center gap-3.5 py-3">
                      <HugeiconsIcon icon={BarChartIcon} size={24} className="shrink-0 text-brand" />
                      <p className="text-sm font-medium text-foreground">{row.label}</p>
                      <p className="ml-auto text-sm font-medium text-muted-foreground">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Package 7's Notification rows, this admin's own — the same
              events that populate the bell, surfaced here as a feed instead
              of a dropdown. */}
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={HistoryIcon} size={22} className="text-foreground" />
                <h2 className="text-base font-medium text-foreground">Live Activity Feed</h2>
              </div>
              <Link href="/portal/notifications" className="text-xs font-medium text-brand hover:underline">
                View all
              </Link>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {recentActivity.map((n) => {
                  const style = ACTIVITY_STYLE[n.type] ?? { bg: "bg-muted", icon: NotificationCircleIcon };
                  return (
                    <div key={n.id} className="flex items-center gap-3.5 py-3">
                      <span className={"flex size-[50px] shrink-0 items-center justify-center " + style.bg}>
                        <HugeiconsIcon icon={style.icon} size={24} className="text-foreground" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
