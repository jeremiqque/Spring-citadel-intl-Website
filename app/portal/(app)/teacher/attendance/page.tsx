import { firstParam } from "@/lib/search-params";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon, Alert02Icon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { prisma } from "@/lib/prisma";
import { requireTeacher, formTeacherClass } from "@/lib/teacher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AttendanceRow } from "./attendance-row";
import { MarkAllPresentButton } from "./mark-all-present";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";
type StatusValue = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

// "Today" in the school's own local time, not UTC — a server running in a
// different timezone from the school must not hand a teacher yesterday's
// (or tomorrow's) date as the default register day. en-CA is the shortest
// built-in way to get Intl to format a Date as YYYY-MM-DD.
function todayIso() {
  return new Date().toLocaleDateString("en-CA");
}

function isValidIsoDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

function shiftIsoDate(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

/**
 * Form-teacher attendance register — Phase 4, the daily twin of
 * teacher/psychomotor/page.tsx. One class (a teacher is form teacher of at
 * most one), one day at a time, rather than one term: attendance's natural
 * axis is the calendar day, not the term, so this page navigates by date
 * (prev/next/jump) instead of the term Segmented every other Phase 1-3
 * screen uses.
 */
export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const raw = await searchParams;
  const rawDate = firstParam(raw.date);
  const date = rawDate && isValidIsoDate(rawDate) ? rawDate : todayIso();

  const { teacherId } = await requireTeacher();
  const [formClass, sessionSetting, termSetting] = await Promise.all([
    formTeacherClass(teacherId),
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
  ]);

  const currentSession = sessionSetting?.value ?? "";
  const currentTerm: TermValue = (termSetting?.value as TermValue) ?? "TERM_1";

  if (!formClass) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" />
        <Surface padding="none">
          <EmptyState icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />} title="You aren't a form teacher yet">
            Attendance, psychomotor ratings and class remarks are entered by each class's
            form teacher. An administrator assigns that role from the Classes page —
            ask them if you're expecting to see a class here.
          </EmptyState>
        </Surface>
      </div>
    );
  }

  const students = await prisma.student.findMany({
    where: { classId: formClass.id, status: { in: ["ACTIVE", "AT_RISK"] } },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const marks = students.length
    ? await prisma.attendance.findMany({
        where: { studentId: { in: students.map((s) => s.id) }, date: new Date(date) },
      })
    : [];
  const markByStudent = new Map(marks.map((m) => [m.studentId, m.status as StatusValue]));

  const presentCount = marks.filter((m) => m.status === "PRESENT").length;
  const absentCount = marks.filter((m) => m.status === "ABSENT").length;
  const lateCount = marks.filter((m) => m.status === "LATE").length;
  const excusedCount = marks.filter((m) => m.status === "EXCUSED").length;
  const notMarkedCount = students.length - marks.length;

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${currentSession ? `${currentSession} · ` : ""}${currentTerm.replace("_", " ")}`}
        title="Attendance"
        description={formClass.name}
      />

      <Surface padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button asChild variant="outline" size="sm">
              <a href={`?date=${shiftIsoDate(date, -1)}`} aria-label="Previous day">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
              </a>
            </Button>
            <form className="flex min-w-0 flex-wrap items-center gap-2">
              <Input
                type="date"
                name="date"
                defaultValue={date}
                max={todayIso()}
                size="sm"
                className="w-auto"
                aria-label="Jump to date"
              />
              <Button type="submit" variant="secondary" size="sm">
                Go
              </Button>
            </form>
            <Button
              asChild
              variant="outline"
              size="sm"
              className={date >= todayIso() ? "pointer-events-none opacity-50" : undefined}
            >
              <a href={`?date=${shiftIsoDate(date, 1)}`} aria-label="Next day" aria-disabled={date >= todayIso()}>
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </a>
            </Button>
          </div>
          <p className="text-sm font-medium text-foreground">{dateLabel}</p>
        </div>
      </Surface>

      {currentSession === "" ? (
        <Surface role="alert" padding="sm" className="border-destructive/30 bg-destructive/5 shadow-none">
          <div className="flex gap-3">
            <HugeiconsIcon icon={Alert02Icon} size={18} className="mt-0.5 shrink-0 text-destructive" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-foreground">No academic session is set.</p>
              <p className="mt-1 leading-body text-muted-foreground">
                Attendance entry is disabled until an administrator sets the current session.
              </p>
            </div>
          </div>
        </Surface>
      ) : (
        students.length > 0 && (
          <StatGroup className="sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Present" value={presentCount} tone="success" />
            <Stat label="Absent" value={absentCount} tone="danger" />
            <Stat label="Late" value={lateCount} tone="warning" />
            <Stat label="Excused" value={excusedCount} />
            <Stat label="Not marked" value={notMarkedCount} tone={notMarkedCount > 0 ? "neutral" : "success"} />
          </StatGroup>
        )
      )}

      <Surface padding="none">
        <SurfaceHeader
          actions={
            currentSession !== "" && students.length > 0 ? (
              <MarkAllPresentButton
                classId={formClass.id}
                term={currentTerm}
                session={currentSession}
                date={date}
                notMarkedCount={notMarkedCount}
              />
            ) : undefined
          }
        >
          <div className="min-w-0">
            <h2 className="text-lg leading-heading font-semibold text-foreground">Register</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mark unmarked students present in one click, then flip any exceptions individually.
            </p>
          </div>
        </SurfaceHeader>

        {students.length === 0 ? (
          <EmptyState icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />} title={`No students are enrolled in ${formClass.name} yet`}>
            There is nothing to mark until an administrator enrols students into this class.
          </EmptyState>
        ) : (
          <Table caption={`Attendance register for ${formClass.name}, ${dateLabel}`}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Admission No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-5 font-mono text-xs text-muted-foreground">{s.admissionNo}</TableCell>
                  <TableCell className="font-medium text-foreground">{s.user.name}</TableCell>
                  <TableCell className="pr-5">
                    <AttendanceRow
                      studentId={s.id}
                      classId={formClass.id}
                      term={currentTerm}
                      session={currentSession}
                      date={date}
                      status={markByStudent.get(s.id) ?? null}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>
    </div>
  );
}
