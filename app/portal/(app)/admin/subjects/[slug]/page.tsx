import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER } from "@/lib/user-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { findSection, subjectsForSection } from "../sections";
import { SubjectCoverage, type SubjectAssignment } from "../subject-coverage";
import { SubjectForm } from "../subject-form";
import { SubjectRowActions } from "../subject-row-actions";

const LEVEL_LABEL: Record<string, string> = {
  EARLY_YEARS: "Early Years",
  PRIMARY: "Primary",
  JSS: "JSS",
  SS: "SS",
};

const STREAM_LABEL: Record<string, string> = {
  CORE: "Core",
  SCIENCE: "Science",
  ARTS: "Arts",
  COMMERCIAL: "Commercial",
};

/**
 * One curriculum category's subject list — reached by clicking a card on
 * the Subjects directory (see ../page.tsx). Same table, add/edit/delete and
 * teacher-coverage controls the old single-page version had, just scoped to
 * one section instead of all of them at once.
 *
 * `subjectsForSection` is the only place "which subjects show up here" is
 * decided, and it is level/stream membership — see sections.ts and
 * actions.ts's own comments — so a subject checked for more than one level
 * (Agricultural Science: JSS and SS Science) legitimately appears on more
 * than one section's page. That is the curriculum, not a bug.
 */
export default async function AdminSubjectSectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = findSection(slug);
  if (!section) notFound();

  const [allSubjects, assignments, allClasses, allTeachers] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    // Full rows, not just counts — SubjectCoverage's dialog lists who's
    // assigned, not just how many. ON_LEAVE teachers still count as
    // assigned — the class is covered on paper, and an admin looking for
    // gaps wants the subjects with nobody at all.
    prisma.teacherAssignment.findMany({
      where: { teacher: { status: { in: ["ACTIVE", "ON_LEAVE"] } } },
      include: { teacher: { include: { user: PUBLIC_USER } }, class: true },
    }),
    prisma.class.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.teacher.findMany({
      where: { status: { in: ["ACTIVE", "ON_LEAVE"] } },
      include: { user: PUBLIC_USER },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const subjects = subjectsForSection(allSubjects, section);

  const assignmentsBySubject = new Map<string, SubjectAssignment[]>();
  for (const a of assignments) {
    if (!assignmentsBySubject.has(a.subjectId)) assignmentsBySubject.set(a.subjectId, []);
    assignmentsBySubject.get(a.subjectId)!.push({
      id: a.id,
      teacherId: a.teacherId,
      teacherName: a.teacher.user.name,
      classId: a.classId,
      className: a.class.name,
    });
  }

  const teacherOptions = allTeachers.map((t) => ({ id: t.id, name: t.user.name }));
  const uncovered = subjects.filter((s) => !assignmentsBySubject.has(s.id)).length;

  return (
    <div className="space-y-6">
      <BackLink href="/portal/admin/subjects" label="Back to Subjects" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <HugeiconsIcon icon={section.icon} size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{section.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {subjects.length} subject{subjects.length === 1 ? "" : "s"} ·{" "}
              {uncovered === 0 ? "all assigned to a teacher" : `${uncovered} with no teacher assigned`}
            </p>
          </div>
        </div>
        <SubjectForm
          mode="create"
          initialLevels={[section.level]}
          initialStreams={section.stream ? [section.stream] : []}
          trigger={<Button size="sm">Add subject</Button>}
        />
      </div>

      <div className="rounded-lg border border-border">
        <Table caption={section.title}>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Levels</TableHead>
              <TableHead>SS field</TableHead>
              <TableHead>Teachers assigned</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No subjects here yet. Add the first one.
                </TableCell>
              </TableRow>
            )}
            {subjects.map((s) => {
              const subjectAssignments = assignmentsBySubject.get(s.id) ?? [];
              const subjectClasses = allClasses
                .filter((c) => s.levels.includes(c.level))
                .map((c) => ({ id: c.id, name: c.name }));
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      {s.name}
                      {/* Compulsory is meaningful only at SS. Showing the
                          flag on a JSS-only subject would imply a rule that
                          does not exist there. */}
                      {s.compulsory && <Badge variant="secondary">Compulsory</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {s.levels.map((l) => (
                        <Badge key={l} variant="outline">
                          {LEVEL_LABEL[l] ?? l}
                        </Badge>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell>
                    {s.streams.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {s.streams.map((st) => (
                          <Badge key={st} variant="outline">
                            {STREAM_LABEL[st] ?? st}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </TableCell>
                  {/* The actionable column: a subject with nobody assigned
                      has no grade sheet and no one able to mark it. Click
                      through to see who, or assign someone right here. */}
                  <TableCell>
                    <SubjectCoverage
                      subjectId={s.id}
                      subjectName={s.name}
                      assignments={subjectAssignments}
                      classes={subjectClasses}
                      teachers={teacherOptions}
                    />
                  </TableCell>
                  <TableCell>
                    <SubjectRowActions
                      subject={{
                        id: s.id,
                        name: s.name,
                        code: s.code,
                        levels: s.levels,
                        streams: s.streams,
                        compulsory: s.compulsory,
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        Which levels a subject is checked for decides which classes teach it and which grade
        sheets exist — there is no separate per-class picker. Assigning a teacher is separate: open
        a subject&apos;s &quot;Teachers assigned&quot; count to see who covers it, or add someone
        directly from there.
      </p>
    </div>
  );
}
