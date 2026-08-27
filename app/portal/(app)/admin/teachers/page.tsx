import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER } from "@/lib/user-select";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { FILTER_SELECT_CLASSNAME } from "@/lib/filter-select-class";
import { TeacherRowActions } from "./teacher-row-actions";

const PAGE_SIZE = 25;

function statusBadgeVariant(status: string): "success" | "warning" | "outline" {
  if (status === "ACTIVE") return "success";
  if (status === "ON_LEAVE") return "warning";
  return "outline"; // INACTIVE
}

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subject?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const subjectId = params.subject ?? "";
  const statusParam = params.status ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.TeacherWhereInput = {};

  if (q) {
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { staffId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (subjectId) {
    where.primarySubjectId = subjectId;
  }
  // Inactive teachers excluded by default, same convention as Students.
  if (statusParam === "ALL") {
    // no status filter
  } else if (statusParam === "ACTIVE" || statusParam === "ON_LEAVE" || statusParam === "INACTIVE") {
    where.status = statusParam;
  } else {
    where.status = { in: ["ACTIVE", "ON_LEAVE"] };
  }

  const [teachers, total, subjects] = await Promise.all([
    prisma.teacher.findMany({
      where,
      include: { user: PUBLIC_USER, primarySubject: true, _count: { select: { assignments: true } } },
      orderBy: { user: { name: "asc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.teacher.count({ where }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (subjectId) sp.set("subject", subjectId);
    if (statusParam) sp.set("status", statusParam);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `?${qs}` : "";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Teachers</h1>
        <Button asChild>
          <Link href="/portal/admin/teachers/new">Add teacher</Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="text-xs text-muted-foreground" htmlFor="q">
            Search
          </label>
          <Input id="q" name="q" defaultValue={q} placeholder="Name or staff ID" className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="subject">
            Subject
          </label>
          <select id="subject" name="subject" defaultValue={subjectId} className={FILTER_SELECT_CLASSNAME}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={statusParam} className={FILTER_SELECT_CLASSNAME}>
            <option value="">Active (default)</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ALL">All</option>
          </select>
        </div>
        {/* Same "field" (h-9) size as the other two Apply buttons — see
            students/page.tsx's comment for why this exists. */}
        <Button type="submit" variant="secondary" size="field">
          Apply
        </Button>
      </form>

      <div className="rounded-lg border border-border">
        <Table caption="Teachers matching the current filters">
          <TableHeader>
            <TableRow>
              <TableHead>Staff ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Primary subject</TableHead>
              <TableHead>Assignments</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No teachers match these filters.
                </TableCell>
              </TableRow>
            )}
            {teachers.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.staffId}</TableCell>
                <TableCell>
                  <Link href={`/portal/admin/teachers/${t.id}`} className="hover:underline">
                    {t.user.name}
                  </Link>
                </TableCell>
                <TableCell>{t.primarySubject?.name ?? "—"}</TableCell>
                <TableCell>{t._count.assignments}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(t.status)}>{t.status.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <TeacherRowActions teacherId={t.id} teacherName={t.user.name} status={t.status} />
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
          itemLabel="teacher"
          totalItems={total}
        />
    </div>
  );
}
