import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { sectionsWithData, subjectsForSection, type SectionDef } from "./sections";

type CardStats = { count: number; uncovered: number };

function SubjectSectionCard({ section, stats }: { section: SectionDef; stats: CardStats }) {
  return (
    <Link
      href={`/portal/admin/subjects/${section.slug}`}
      className="group flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-brand/40 hover:bg-brand/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand">
        <HugeiconsIcon icon={section.icon} size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{section.title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{section.description}</span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">
            {stats.count} subject{stats.count === 1 ? "" : "s"}
          </Badge>
          {stats.uncovered > 0 && <Badge variant="warning">{stats.uncovered} uncovered</Badge>}
        </span>
      </span>
    </Link>
  );
}

/**
 * The Subjects directory — a grid of clickable category cards, same pattern
 * as /admin/settings: a landing page of cards rather than one long page of
 * everything at once. Click a card (Nursery, Primary, JSS, or one of the
 * Senior Secondary fields) to open that category's own subject list, where
 * subjects can be added, edited, deleted and covered — see [slug]/page.tsx.
 *
 * The curriculum itself moved from a seed-script-only change to a real admin
 * task (see actions.ts); this directory is what makes "61 subjects in one
 * flat table" navigable now that adding one is a click away instead of a
 * code change.
 */
export default async function AdminSubjectsPage() {
  const subjects = await prisma.subject.findMany({ select: { id: true, levels: true, streams: true } });
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacher: { status: { in: ["ACTIVE", "ON_LEAVE"] } } },
    select: { subjectId: true },
  });
  const coveredSubjectIds = new Set(assignments.map((a) => a.subjectId));

  const sections = sectionsWithData(subjects);
  const stats = new Map<string, CardStats>();
  for (const section of sections) {
    const inSection = subjectsForSection(subjects, section);
    const uncovered = inSection.filter((s) => !coveredSubjectIds.has(s.id)).length;
    stats.set(section.slug, { count: inSection.length, uncovered });
  }

  const totalUncovered = subjects.filter((s) => !coveredSubjectIds.has(s.id)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Subjects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {subjects.length} subject{subjects.length === 1 ? "" : "s"} across the curriculum ·{" "}
          {totalUncovered === 0 ? "all assigned to a teacher" : `${totalUncovered} with no teacher assigned`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <SubjectSectionCard key={section.slug} section={section} stats={stats.get(section.slug)!} />
        ))}
      </div>
    </div>
  );
}
