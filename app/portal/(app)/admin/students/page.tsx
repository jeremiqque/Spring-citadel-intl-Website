import { firstParam } from "@/lib/search-params";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon, PrinterIcon } from "@hugeicons/core-free-icons";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER } from "@/lib/user-select";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { FilterSelect, FILTER_ALL_VALUE } from "@/components/ui/filter-select";
import { StudentTable } from "./student-table";

const PAGE_SIZE = 25;

export default async function StudentsPage({
  searchParams,
}: {
  // Every one of these is `string | string[]`: Next hands back an ARRAY for a
  // repeated query key. Typed as plain `string`, `?class=a&class=b` put an
  // ARRAY into `where.classId`, which Prisma rejects with a validation error
  // — a 500 from a hand-edited URL, on the page most likely to be shared as
  // a link between staff.
  searchParams: Promise<{
    q?: string | string[];
    class?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q)?.trim() ?? "";
  const classIdRaw = firstParam(params.class) ?? "";
  const classId = classIdRaw === FILTER_ALL_VALUE ? "" : classIdRaw;
  const statusParamRaw = firstParam(params.status) ?? "";
  const statusParam = statusParamRaw === FILTER_ALL_VALUE ? "" : statusParamRaw;
  const page = Math.max(1, Number(firstParam(params.page)) || 1);

  const where: Prisma.StudentWhereInput = {};

  if (q) {
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { admissionNo: { contains: q, mode: "insensitive" } },
    ];
  }
  if (classId) {
    where.classId = classId;
  }
  // Inactive students are excluded from the list by default (per spec) —
  // only shown when explicitly asked for via status=INACTIVE or status=ALL.
  if (statusParam === "ALL") {
    // no status filter
  } else if (statusParam === "ACTIVE" || statusParam === "AT_RISK" || statusParam === "INACTIVE") {
    where.status = statusParam;
  } else {
    where.status = { in: ["ACTIVE", "AT_RISK"] };
  }

  const [students, total, classes] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { user: PUBLIC_USER, class: true },
      orderBy: { user: { name: "asc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.student.count({ where }),
    prisma.class.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }] }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (classId) sp.set("class", classId);
    if (statusParam) sp.set("status", statusParam);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `?${qs}` : "";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Students</h1>
        <Button asChild>
          <Link href="/portal/admin/students/new">Enroll student</Link>
        </Button>
      </div>

      {/* Plain GET form — every filter combination is a shareable URL and
          works without JS. Submitting always resets to page 1 since `page`
          isn't a field here. */}
      <form className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="text-xs text-muted-foreground" htmlFor="q">
            Search
          </label>
          <Input id="q" name="q" defaultValue={q} placeholder="Name or admission no." className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="class">
            Class
          </label>
          <FilterSelect
            id="class"
            name="class"
            defaultValue={classId || FILTER_ALL_VALUE}
            options={[
              { value: FILTER_ALL_VALUE, label: "All classes" },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="status">
            Status
          </label>
          <FilterSelect
            id="status"
            name="status"
            defaultValue={statusParam || FILTER_ALL_VALUE}
            options={[
              { value: FILTER_ALL_VALUE, label: "Active (default)" },
              { value: "AT_RISK", label: "At risk" },
              { value: "INACTIVE", label: "Inactive" },
              { value: "ALL", label: "All" },
            ]}
          />
        </div>
        {/* Action cluster from Figma node 4261:6100: glossy primary, a 24px
            vertical rule, then outlined secondaries with leading icons, 10px
            apart (the reference's own gap).

            All three buttons here now share the "field" (h-9) size, the
            same rung Teachers' and Grades' own Apply buttons use — one
            baseline for every form-row button in the app instead of each
            page reaching for its own height override.

            Export and Print are inert placeholders for now, same treatment
            as Ask AI: aria-disabled rather than the disabled attribute, so
            they stay reachable by keyboard/screen reader with their
            "coming soon" label intact instead of dropping out of the tab
            order silently.

            NO onClick HERE. This page is an async server component, and a
            server component cannot pass a function to a client component —
            React throws "Event handlers cannot be passed to Client Component
            props" and the whole page falls through to error.tsx. The handlers
            these two buttons used to carry were `(e) => e.preventDefault()`,
            which was doing nothing anyway: type="button" already means the
            click neither submits the form nor navigates. If these buttons ever
            need real behaviour, they move into a "use client" component the
            way StudentRowActions did. */}
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          <Button type="submit" size="field" className="rounded-xl px-6 sm:px-10">
            Apply
          </Button>
          <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
          <Button
            type="button"
            variant="outline"
            size="field"
            aria-disabled="true"
            title="Export — coming soon"
            aria-label="Export (coming soon)"
            className="gap-2 rounded-xl bg-background px-2.5 opacity-60"
          >
            <HugeiconsIcon icon={Download01Icon} size={16} />
            Export
            <span className="sr-only">(coming soon)</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="field"
            aria-disabled="true"
            title="Print — coming soon"
            aria-label="Print (coming soon)"
            className="gap-2 rounded-xl bg-background px-2.5 opacity-60"
          >
            <HugeiconsIcon icon={PrinterIcon} size={16} />
            Print
            <span className="sr-only">(coming soon)</span>
          </Button>
        </div>
      </form>

      <StudentTable
        students={students.map((s) => ({
          id: s.id,
          admissionNo: s.admissionNo,
          name: s.user.name,
          className: s.class.name,
          gender: s.gender,
          status: s.status,
        }))}
      />

      <Pagination
          page={page}
          totalPages={totalPages}
          hrefForPage={pageHref}
          itemLabel="student"
          totalItems={total}
        />
    </div>
  );
}
