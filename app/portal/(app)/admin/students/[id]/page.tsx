import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
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
import { average, scoreToLetter } from "@/lib/grading";
import { getGradingConfig } from "@/lib/grading-settings";

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
    include: { user: true, class: true },
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

  const [currentGrades, historyGrades, historyTotal] = await Promise.all([
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
  ]);

  const currentAverage = average(currentGrades.map((g) => g.total));
  const gradingConfig = await getGradingConfig();
  const currentLetter =
    currentAverage === null ? null : scoreToLetter(currentAverage, gradingConfig);

  const totalPages = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE));

  function pageHref(targetPage: number) {
    return targetPage > 1 ? `?page=${targetPage}` : "";
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{student.user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {student.admissionNo} — {student.class.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusBadgeVariant(student.status)}>{student.status.replace("_", " ")}</Badge>
          <Button asChild variant="outline">
            <Link href={`/portal/admin/students/${student.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground">Personal details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Date of birth</dt>
              <dd>{student.dob.toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Gender</dt>
              <dd className="capitalize">{student.gender.toLowerCase()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Class</dt>
              <dd>{student.class.name}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground">Guardian</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{student.guardianName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{student.guardianPhone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">Address</dt>
              <dd className="text-right">{student.address}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-1 text-sm font-medium text-foreground">
          Current term average
          {currentSessionSetting && currentTermSetting && (
            <span className="ml-2 font-normal text-muted-foreground">
              ({currentSessionSetting.value}, {currentTermSetting.value.replace("_", " ")})
            </span>
          )}
        </h2>
        {currentAverage === null ? (
          <p className="text-sm text-muted-foreground">No grades recorded yet for the current term.</p>
        ) : (
          <p className="text-2xl font-semibold text-foreground">
            {currentAverage.toFixed(1)}{" "}
            <span className="text-base font-normal text-muted-foreground">({currentLetter})</span>
          </p>
        )}
      </section>

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
                      <TableCell>{g.total}</TableCell>
                      <TableCell>{g.grade}</TableCell>
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
