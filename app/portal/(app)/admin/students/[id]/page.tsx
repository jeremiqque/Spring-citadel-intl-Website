import { notFound } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BarChartIcon,
  Book01Icon,
  HistoryIcon,
  IdentityCardIcon,
  UserGroupIcon,
  CakeIcon,
  UserCircleIcon,
  Call02Icon,
  Location01Icon,
} from "@hugeicons/core-free-icons";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER } from "@/lib/user-select";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { InfoCard, InfoRow } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { average, scoreToLetter, GRADE_BAND_CLASS } from "@/lib/grading";
import { getGradingConfig } from "@/lib/grading-settings";
import { avatarUrl } from "@/lib/avatar";
import { Avatar } from "@/components/ui/avatar";
import { RemovePhotoButton } from "../../remove-photo-button";

// A student accumulates a grade row per subject per term forever — the
// history table used to load every one of them via a single unbounded
// `include`, no skip/take. Fine for a first-term student, not fine years
// in. Paginated the same way every other list in the app is.
const HISTORY_PAGE_SIZE = 20;

function statusBadgeVariant(status: string): "success" | "warning" | "outline" {
  if (status === "ACTIVE") return "success";
  if (status === "AT_RISK") return "warning";
  return "outline";
}

// Same green/amber/red/neutral read as GRADE_BAND_CLASS, but as separate
// bg/text pairs rather than one combined string — the KPI tiles below need
// the two on different elements (a coloured circle, then the icon inside
// it), matching the icon-chip pattern the admin dashboard already
// established (see app/portal/(app)/admin/page.tsx).
const TILE_COLOR = {
  green: { bg: "bg-green-100", text: "text-green-800" },
  amber: { bg: "bg-amber-100", text: "text-amber-800" },
  red: { bg: "bg-destructive/10", text: "text-destructive" },
  blue: { bg: "bg-blue-100", text: "text-blue-800" },
  violet: { bg: "bg-violet-100", text: "text-violet-800" },
  neutral: { bg: "bg-muted", text: "text-muted-foreground" },
};

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const student = await prisma.student.findUnique({
    where: { id },
    include: { user: PUBLIC_USER, class: true },
  });

  if (!student) notFound();

  // "Current" is whatever the admin has the school's term/session set to
  // (Setting table) — not just "the most recent grade row" — so this stays
  // correct across a term rollover even before any grade exists for it.
  // Bounded on its own: at most one row per subject this term, never grows
  // with the student's history, so it doesn't need pagination.
  const [currentSessionSetting, currentTermSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
  ]);

  const [currentGrades, historyGrades, historyTotal, classSubjects] = await Promise.all([
    currentSessionSetting && currentTermSetting
      ? prisma.grade.findMany({
          where: { studentId: id, session: currentSessionSetting.value, term: currentTermSetting.value as "TERM_1" | "TERM_2" | "TERM_3" },
        })
      : Promise.resolve([]),
    prisma.grade.findMany({
      where: { studentId: id },
      include: { subject: true },
      orderBy: [{ session: "desc" }, { term: "desc" }],
      skip: (page - 1) * HISTORY_PAGE_SIZE,
      take: HISTORY_PAGE_SIZE,
    }),
    prisma.grade.count({ where: { studentId: id } }),
    // Same query the grades screen uses to size its subject columns — here
    // it's the denominator for "how much of this term is actually in yet",
    // which the page didn't answer at all before: "No grades recorded yet
    // for the current term" looked identical whether nothing had been
    // entered or everything except one subject had.
    prisma.subject.findMany({ where: { levels: { has: student.class.level } }, select: { id: true } }),
  ]);

  // The OFFICIAL, admin-facing counterpart to the student page's own
  // "Official result" panel — same PUBLISHED-only visibility rule doesn't
  // apply to an admin (they already see COMPILED results in
  // admin/results), but the download link is only meaningful once a result
  // is actually PUBLISHED, since that's the only status generateReportCardPdf()
  // will render.
  const termResult =
    currentSessionSetting && currentTermSetting
      ? await prisma.termResult.findUnique({
          where: {
            studentId_term_session: {
              studentId: id,
              term: currentTermSetting.value as "TERM_1" | "TERM_2" | "TERM_3",
              session: currentSessionSetting.value,
            },
          },
        })
      : null;

  const currentAverage = average(currentGrades.map((g) => g.total));
  const gradingConfig = await getGradingConfig();
  const currentLetter =
    currentAverage === null ? null : scoreToLetter(currentAverage, gradingConfig);

  const totalPages = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE));

  function pageHref(targetPage: number) {
    return targetPage > 1 ? `?page=${targetPage}` : "";
  }

  const averageColor =
    currentLetter === null
      ? TILE_COLOR.neutral
      : currentLetter === "F"
        ? TILE_COLOR.red
        : currentLetter === "A" || currentLetter === "B"
          ? TILE_COLOR.green
          : TILE_COLOR.amber;

  const periodLabel =
    currentSessionSetting && currentTermSetting
      ? `${currentSessionSetting.value}, ${currentTermSetting.value.replace("_", " ")}`
      : null;

  return (
    <div className="space-y-8">
      <BackLink href="/portal/admin/students" label="Back to students" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Falls back to the two-letter initials this page already used
              when there is no photo, so an account without one looks exactly
              as it did before the feature existed. */}
          <Avatar
            src={avatarUrl(student.user.id, student.user.avatarUpdatedAt)}
            name={student.user.name}
            size="lg"
            className="text-lg"
          />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{student.user.name}</h1>
            <p className="text-sm text-muted-foreground">
              {student.admissionNo} — {student.class.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusBadgeVariant(student.status)}>{student.status.replace("_", " ")}</Badge>
          {/* Only rendered when there is actually a photo to remove — a
              permanently visible control for a thing that does not exist
              reads as broken, and invites a click that can only no-op. */}
          {student.user.avatarUpdatedAt && (
            <RemovePhotoButton userId={student.user.id} personName={student.user.name} />
          )}
          <Button asChild variant="outline">
            <Link href={`/portal/admin/students/${student.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>

      {/* Replaces the old single "Current term average" box, which was the
          only stat on the page and — with nothing graded yet, the normal
          state for a student early in a term — left the whole top of the
          page reading as empty rather than as "nothing's landed yet, here's
          what's expected." Same icon-chip + label + big-number card the
          admin dashboard's own KPI row uses (app/portal/(app)/admin/page.tsx),
          reused rather than a new pattern invented for one screen. */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className={"flex size-6 items-center justify-center rounded-full " + averageColor.bg}>
              <HugeiconsIcon icon={BarChartIcon} size={16} className={averageColor.text} />
            </span>
            <p className="text-sm font-medium text-foreground">Current term average</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">
            {currentAverage === null ? "—" : currentAverage.toFixed(1)}
            {currentLetter && (
              <span className="ml-1.5 text-base font-normal text-muted-foreground">({currentLetter})</span>
            )}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {periodLabel ?? "No academic session is set"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className={"flex size-6 items-center justify-center rounded-full " + TILE_COLOR.blue.bg}>
              <HugeiconsIcon icon={Book01Icon} size={16} className={TILE_COLOR.blue.text} />
            </span>
            <p className="text-sm font-medium text-foreground">Subjects graded</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">
            {classSubjects.length === 0 ? "—" : `${currentGrades.length}/${classSubjects.length}`}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            of {classSubjects.length} subjects for {student.class.name} this term
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-[15px]">
            <span className={"flex size-6 items-center justify-center rounded-full " + TILE_COLOR.violet.bg}>
              <HugeiconsIcon icon={HistoryIcon} size={16} className={TILE_COLOR.violet.text} />
            </span>
            <p className="text-sm font-medium text-foreground">Lifetime results</p>
          </div>
          <p data-numeric className="mt-4 text-[28px] font-medium text-foreground">{historyTotal}</p>
          <p className="mt-3 text-xs text-muted-foreground">grade entries on record since enrolment</p>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <InfoCard icon={IdentityCardIcon} color="blue" title="Personal details">
          <InfoRow icon={CakeIcon} label="Date of birth" value={student.dob.toLocaleDateString()} />
          <InfoRow icon={UserCircleIcon} label="Gender" value={<span className="capitalize">{student.gender.toLowerCase()}</span>} />
          <InfoRow icon={Book01Icon} label="Class" value={student.class.name} />
        </InfoCard>

        <InfoCard icon={UserGroupIcon} color="violet" title="Guardian">
          <InfoRow icon={UserCircleIcon} label="Name" value={student.guardianName} />
          <InfoRow icon={Call02Icon} label="Phone" value={student.guardianPhone} />
          <InfoRow icon={Location01Icon} label="Address" value={student.address} />
        </InfoCard>
      </section>

      {termResult?.status === "PUBLISHED" && (
        <section className="rounded-lg border border-border bg-muted/20 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium text-foreground">
                Published result — {termResult.term.replace("_", " ")}, {termResult.session}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Average {termResult.average.toFixed(1)} ·{" "}
                {termResult.position ? `${termResult.position} of ${termResult.classSize}` : "Not ranked"}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/portal/report-card/${termResult.id}`}>Download report card</a>
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Grade history</h2>
        {historyGrades.length === 0 ? (
          <p className="text-sm text-muted-foreground">No grades recorded yet.</p>
        ) : (
          <>
            <div className="rounded-lg border border-border">
              <Table caption={`Full grade history for ${student.user.name}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyGrades.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>{g.session}</TableCell>
                      <TableCell>{g.term.replace("_", " ")}</TableCell>
                      <TableCell>{g.subject.name}</TableCell>
                      <TableCell className="tabular-nums">{g.total}</TableCell>
                      <TableCell>
                        {/* Was plain text ("A", "F", ...) — the same coloured
                            chip the grades overview's subject breakdown uses
                            (GRADE_BAND_CLASS, lib/grading.ts), so a guardian
                            or admin scanning years of history can spot a run
                            of red without reading every row. */}
                        <span
                          className={
                            "inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-xs font-semibold " +
                            GRADE_BAND_CLASS[g.grade]
                          }
                        >
                          {g.grade}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              hrefForPage={pageHref}
            />
          </>
        )}
      </section>
    </div>
  );
}
