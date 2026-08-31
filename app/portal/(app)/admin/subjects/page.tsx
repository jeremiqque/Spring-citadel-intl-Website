import { prisma } from "@/lib/prisma";
import { PUBLIC_USER } from "@/lib/user-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SubjectCoverage, type SubjectAssignment } from "./subject-coverage";
import { SubjectForm } from "./subject-form";
import { SubjectRowActions } from "./subject-row-actions";

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

type SubjectRow = Awaited<ReturnType<typeof prisma.subject.findMany>>[number];

/**
 * A section is "every subject whose levels/streams put it in this bucket."
 * The same subject can appear in more than one section — Agricultural
 * Science runs at both JSS (no field structure there) and SS Science, so it
 * legitimately belongs in both the Junior Secondary table and the Senior
 * Secondary · Science table. That mirrors the real curriculum rather than
 * hiding it.
 */
type Section = { key: string; title: string; subjects: SubjectRow[] };

function buildSections(subjects: SubjectRow[]): Section[] {
  const sections: Section[] = [
    { key: "EARLY_YEARS", title: "Nursery (Early Years)", subjects: subjects.filter((s) => s.levels.includes("EARLY_YEARS")) },
    { key: "PRIMARY", title: "Primary", subjects: subjects.filter((s) => s.levels.includes("PRIMARY")) },
    { key: "JSS", title: "Junior Secondary (JSS)", subjects: subjects.filter((s) => s.levels.includes("JSS")) },
  ];

  const ssSubjects = subjects.filter((s) => s.levels.includes("SS"));
  const ssStreamOrder = ["CORE", "SCIENCE", "ARTS", "COMMERCIAL"] as const;
  for (const stream of ssStreamOrder) {
    const inStream = ssSubjects.filter((s) => s.streams.includes(stream));
    if (inStream.length > 0) {
      sections.push({ key: `SS_${stream}`, title: `Senior Secondary · ${STREAM_LABEL[stream]}`, subjects: inStream });
    }
  }
  // SS subjects with no field at all — should not normally happen given the
  // seeded curriculum, but a field-less SS subject is valid at the schema
  // level, so it needs somewhere to show up rather than silently vanishing
  // from the page.
  const ssUnstreamed = ssSubjects.filter((s) => s.streams.length === 0);
  if (ssUnstreamed.length > 0) {
    sections.push({ key: "SS_NONE", title: "Senior Secondary · General", subjects: ssUnstreamed });
  }

  return sections.filter((s) => s.subjects.length > 0);
}

/**
 * Subjects — the curriculum itself is now an admin task, not a seed-script
 * one (see actions.ts). Grouped into the sections the office actually thinks
 * in — Nursery, Primary, JSS, and Senior Secondary split by field — instead
 * of one flat alphabetical table, because "which subjects does SS Science
 * take" was a scroll-and-squint exercise before.
 *
 * `Subject.levels` is still the entire mechanism for "which classes teach
 * this" — see createSubjectAction/updateSubjectAction's comments — so
 * checking/unchecking a level in the form is how a subject is added to or
 * removed from a class's curriculum; there is no separate per-class picker.
 *
 * "Teachers assigned" is unchanged from before: SubjectCoverage opens the
 * same add/remove-assignment flow right here.
 */
export default async function AdminSubjectsPage() {
  const [subjects, assignments, allClasses, allTeachers] = await Promise.all([
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
  const sections = buildSections(subjects);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Subjects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subjects.length} subject{subjects.length === 1 ? "" : "s"} ·{" "}
            {uncovered === 0 ? "all assigned to a teacher" : `${uncovered} with no teacher assigned`}
          </p>
        </div>
        <SubjectForm mode="create" trigger={<Button size="sm">Add subject</Button>} />
      </div>

      {subjects.length === 0 && (
        <div className="rounded-lg border border-border py-12 text-center text-sm text-muted-foreground">
          No subjects yet. Add the first one to start building the curriculum.
        </div>
      )}

      {sections.map((section) => (
        <div key={section.key} className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">
            {section.title}{" "}
            <span className="font-normal text-muted-foreground">
              ({section.subjects.length} subject{section.subjects.length === 1 ? "" : "s"})
            </span>
          </h2>
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
                {section.subjects.map((s) => {
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
                              flag on a JSS-only subject would imply a rule
                              that does not exist there. */}
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
                      {/* The actionable column: a subject with nobody
                          assigned has no grade sheet and no one able to mark
                          it. Click through to see who, or assign someone
                          right here. */}
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
        </div>
      ))}

      <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        Which levels a subject is checked for decides which classes teach it and which grade
        sheets exist — there is no separate per-class picker. Assigning a teacher is separate: open
        a subject&apos;s &quot;Teachers assigned&quot; count to see who covers it, or add someone
        directly from there.
      </p>
    </div>
  );
}
