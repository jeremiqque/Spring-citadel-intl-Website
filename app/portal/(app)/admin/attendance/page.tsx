import { firstParam } from "@/lib/search-params";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { prisma } from "@/lib/prisma";
import { FilterSelect } from "@/components/ui/filter-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Surface, EmptyState } from "@/components/ui/surface";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AdminAttendanceRow } from "./admin-attendance-row";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";
type StatusValue = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

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
 * The admin twin of teacher/attendance/page.tsx: a class picker (there's no
 * single class to default to, unlike the form-teacher page) plus the same
 * date-driven register below it, editable the same way — an admin can
 * correct or stand in for any class's form teacher. A term-to-date
 * attendance-rate summary sits underneath, the "admin view" half of the
 * plan's Phase 4 scope: per-student PRESENT/ABSENT/LATE/EXCUSED counts and a
 * rate for the currently active term/session, the same figures
 * compileClassResults() rolls into TermResult.attendancePresent/Total at
 * compile time (see lib/term-result.ts).
 */
export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string | string[]; date?: string | string[] }>;
}) {
  const raw = await searchParams;
  const params = { class: firstParam(raw.class), date: firstParam(raw.date) };
  const date = params.date && isValidIsoDate(params.date) ? params.date : todayIso();

  const [classes, sessionSetting, termSetting] = await Promise.all([
    prisma.class.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
  ]);

  const currentSession = sessionSetting?.value ?? "";
  const currentTerm: TermValue = (termSetting?.value as TermValue) ?? "TERM_1";

  if (classes.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" />
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

  const students = await prisma.student.findMany({
    where: { classId: activeClassId, status: { in: ["ACTIVE", "AT_RISK"] } },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const [dayMarks, termMarks] = await Promise.all([
    students.length
      ? prisma.attendance.findMany({
          where: { studentId: { in: students.map((s) => s.id) }, date: new Date(date) },
        })
      : Promise.resolve([]),
    students.length && currentSession !== ""
      ? prisma.attendance.findMany({
          where: {
            studentId: { in: students.map((s) => s.id) },
            term: currentTerm,
            session: currentSession,
          },
        })
      : Promise.resolve([]),
  ]);

  const dayMarkByStudent = new Map(dayMarks.map((m) => [m.studentId, m.status as StatusValue]));

  const termMarksByStudent = new Map<string, StatusValue[]>();
  for (const m of termMarks) {
    const list = termMarksByStudent.get(m.studentId) ?? [];
    list.push(m.status as StatusValue);
    termMarksByStudent.set(m.studentId, list);
  }

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  function hrefFor(classId: string, targetDate: string) {
    const sp = new URLSearchParams();
    sp.set("class", classId);
    sp.set("date", targetDate);
    return `?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${currentSession ? `${currentSession} · ` : ""}${currentTerm.replace("_", " ")}`}
        title="Attendance"
        description={activeClass.formTeacherId ? activeClass.name : `${activeClass.name} — no form teacher assigned`}
      />

      <Surface padding="sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <form className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="date" value={date} />
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

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={hrefFor(activeClassId, shiftIsoDate(date, -1))} aria-label="Previous day">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
              </a>
            </Button>
            <form className="flex items-center gap-2">
              <input type="hidden" name="class" value={activeClassId} />
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
            <p className="text-sm font-medium text-foreground">{dateLabel}</p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className={date >= todayIso() ? "pointer-events-none opacity-50" : undefined}
            >
              <a
                href={hrefFor(activeClassId, shiftIsoDate(date, 1))}
                aria-label="Next day"
                aria-disabled={date >= todayIso()}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </a>
            </Button>
          </div>
        </div>
      </Surface>

      <Surface padding="none">
        {students.length === 0 ? (
          <EmptyState icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />} title={`No students are enrolled in ${activeClass.name} yet`}>
            There is nothing to mark until students are enrolled into this class.
          </EmptyState>
        ) : (
          <Table caption={`Attendance register for ${activeClass.name}, ${dateLabel}`}>
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
                    <AdminAttendanceRow
                      studentId={s.id}
                      classId={activeClassId}
                      term={currentTerm}
                      session={currentSession}
                      date={date}
                      status={dayMarkByStudent.get(s.id) ?? null}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>

      {currentSession !== "" && students.length > 0 && (
        <Surface padding="none">
          <div className="px-5 pt-4 pb-1">
            <h2 className="text-sm font-medium text-foreground">
              Attendance summary — {currentTerm.replace("_", " ")}, {currentSession}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              What compiling this class's results will roll into each student&apos;s report card.
            </p>
          </div>
          <Table caption={`Term attendance summary for ${activeClass.name}`}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Name</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Excused</TableHead>
                <TableHead className="pr-5">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const marks = termMarksByStudent.get(s.id) ?? [];
                const present = marks.filter((m) => m === "PRESENT").length;
                const absent = marks.filter((m) => m === "ABSENT").length;
                const late = marks.filter((m) => m === "LATE").length;
                const excused = marks.filter((m) => m === "EXCUSED").length;
                // Same rule compileClassResults() uses: EXCUSED days count
                // toward neither side, LATE counts as attended.
                const total = present + absent + late;
                const rate = total > 0 ? Math.round(((present + late) / total) * 100) : null;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="pl-5 font-medium text-foreground">{s.user.name}</TableCell>
                    <TableCell>{present}</TableCell>
                    <TableCell>{absent}</TableCell>
                    <TableCell>{late}</TableCell>
                    <TableCell>{excused}</TableCell>
                    <TableCell className="pr-5">{rate === null ? "—" : `${rate}%`}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Surface>
      )}
    </div>
  );
}
