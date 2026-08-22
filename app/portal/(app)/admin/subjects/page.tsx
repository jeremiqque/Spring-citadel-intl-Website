import { firstParam } from "@/lib/search-params";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { FILTER_SELECT_CLASSNAME } from "@/lib/filter-select-class";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

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

const LEVELS = ["EARLY_YEARS", "PRIMARY", "JSS", "SS"] as const;
type LevelValue = (typeof LEVELS)[number];

/**
 * Subjects — read-only.
 *
 * Read-only for a narrower reason than Classes: `Subject.code` does not feed
 * anything printed, but a subject's `levels` array decides which classes it
 * can be assigned to and therefore which grade sheets exist, and `streams`
 * encodes the SS field structure the school confirmed on 14 Aug 2026.
 * Editing those is a curriculum decision, not an admin task, and the seed
 * script is where it is recorded.
 *
 * What this screen is FOR: seeing what the curriculum actually contains, per
 * level, and which subjects have nobody assigned to teach them — that last
 * column is the one an admin can act on, by going to a teacher's profile and
 * adding an assignment.
 */
export default async function AdminSubjectsPage({
  searchParams,
}: {
  // `string | string[]`, not `string`. Next hands back an ARRAY for a
  // repeated query key, so `?level=JSS&level=SS` makes this an array while
  // the type annotation quietly insists otherwise. Harmless here only because
  // the value is whitelisted below before it reaches Prisma — the annotation
  // is what makes that easy to forget.
  searchParams: Promise<{ level?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawLevel = firstParam(params.level);
  const level = LEVELS.includes(rawLevel as LevelValue) ? (rawLevel as LevelValue) : undefined;

  const [subjects, assignments] = await Promise.all([
    prisma.subject.findMany({
      where: level ? { levels: { has: level } } : {},
      orderBy: { name: "asc" },
    }),
    // One query for coverage across every subject, rather than a count per
    // row. ON_LEAVE teachers still count as assigned — the class is covered
    // on paper, and an admin looking for gaps wants the subjects with nobody
    // at all.
    //
    // Rows, not counts, because the column is "teachers" and
    // TeacherAssignment is unique on (teacherId, classId, subjectId) — one
    // row per class. Counting rows made the only Mathematics teacher, who
    // covers JSS 1-3, render as "3 teachers assigned", and disagreed with the
    // Classes page, which de-duplicates the identical data.
    prisma.teacherAssignment.findMany({
      where: { teacher: { status: { in: ["ACTIVE", "ON_LEAVE"] } } },
      select: { subjectId: true, teacherId: true },
    }),
  ]);

  const teachersBySubject = new Map<string, Set<string>>();
  for (const a of assignments) {
    if (!teachersBySubject.has(a.subjectId)) teachersBySubject.set(a.subjectId, new Set());
    teachersBySubject.get(a.subjectId)!.add(a.teacherId);
  }

  const uncovered = subjects.filter((s) => !teachersBySubject.has(s.id)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Subjects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {subjects.length} subject{subjects.length === 1 ? "" : "s"}
          {level ? ` at ${LEVEL_LABEL[level]}` : ""} ·{" "}
          {uncovered === 0 ? "all assigned to a teacher" : `${uncovered} with no teacher assigned`}
        </p>
      </div>

      {/* Plain GET form over a native select, matching every other admin
          filter row: each combination is a shareable, JS-free URL. */}
      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="level">
            Level
          </label>
          <select id="level" name="level" defaultValue={level ?? ""} className={FILTER_SELECT_CLASSNAME}>
            <option value="">All levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary" size="field">
          Apply
        </Button>
      </form>

      <div className="rounded-lg border border-border">
        <Table caption={level ? `Subjects at ${LEVEL_LABEL[level]}` : "All subjects"}>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Levels</TableHead>
              <TableHead>SS field</TableHead>
              <TableHead>Teachers assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No subjects match this level.
                </TableCell>
              </TableRow>
            )}
            {subjects.map((s) => {
              const assigned = teachersBySubject.get(s.id)?.size ?? 0;
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
                      has no grade sheet and no one able to mark it. */}
                  <TableCell>
                    {assigned === 0 ? (
                      <Badge variant="warning">None</Badge>
                    ) : (
                      assigned
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        Subjects are read-only here. Which levels a subject runs at decides which grade
        sheets exist, and the SS field groupings are the curriculum the school confirmed —
        both are changes to the seed script rather than admin tasks. To give a subject a
        teacher, open that teacher&apos;s profile and add a class assignment.
      </p>
    </div>
  );
}
