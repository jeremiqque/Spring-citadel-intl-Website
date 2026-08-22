import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
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
  JSS: "Junior Secondary",
  SS: "Senior Secondary",
};

/**
 * Classes — read-only.
 *
 * ── WHY READ-ONLY, AND WHY THAT IS NOT A PLACEHOLDER ──────────────────────
 * `Class.code` feeds the admission number ("SCIS/2026/JSS3/001", see
 * lib/ids.ts), and admission numbers go on paper records the school keeps for
 * years. An edit form over this table would let one mistyped code silently
 * change the number every subsequent student in that class is issued, with no
 * relationship to the numbers already printed on the admission letters of the
 * children sitting in the same room.
 *
 * `gradingEnabled` is the other trap: turning it on for Primary would offer
 * teachers a 20/30/50 marking sheet for a level the school has no agreed
 * assessment scheme for. The seed derives it from the level for that reason.
 *
 * So this screen exists to answer "what classes are there, how full are they,
 * and who teaches them" — which is what an admin actually opens it for.
 * Structural changes stay in prisma/seed.ts, where they get a code review and
 * a deploy, which is the correct amount of ceremony for a decision this
 * expensive to reverse.
 *
 * Query shape: four grouped queries total, not one per class.
 */
export default async function AdminClassesPage() {
  const [classes, studentCounts, atRiskCounts, assignments] = await Promise.all([
    prisma.class.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.student.groupBy({
      by: ["classId"],
      where: { status: { in: ["ACTIVE", "AT_RISK"] } },
      _count: { _all: true },
    }),
    prisma.student.groupBy({
      by: ["classId"],
      where: { status: "AT_RISK" },
      _count: { _all: true },
    }),
    prisma.teacherAssignment.findMany({
      // Only assignments whose teacher is still on the staff — an INACTIVE
      // teacher's rows survive (soft delete) and would otherwise be counted
      // as current cover for a class nobody is teaching.
      where: { teacher: { status: { in: ["ACTIVE", "ON_LEAVE"] } } },
      select: { classId: true, teacherId: true, subjectId: true },
    }),
  ]);

  const studentsByClass = new Map(studentCounts.map((r) => [r.classId, r._count._all]));
  const atRiskByClass = new Map(atRiskCounts.map((r) => [r.classId, r._count._all]));

  const teachersByClass = new Map<string, Set<string>>();
  const subjectsByClass = new Map<string, Set<string>>();
  for (const a of assignments) {
    if (!teachersByClass.has(a.classId)) teachersByClass.set(a.classId, new Set());
    if (!subjectsByClass.has(a.classId)) subjectsByClass.set(a.classId, new Set());
    teachersByClass.get(a.classId)!.add(a.teacherId);
    subjectsByClass.get(a.classId)!.add(a.subjectId);
  }

  const totalStudents = studentCounts.reduce((n, r) => n + r._count._all, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {classes.length} classes · {totalStudents} enrolled students
        </p>
      </div>

      <div className="rounded-lg border border-border">
        <Table caption="All classes">
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>At risk</TableHead>
              <TableHead>Teachers</TableHead>
              <TableHead>Subjects covered</TableHead>
              <TableHead>Grading</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No classes have been set up yet. They are created by the seed script.
                </TableCell>
              </TableRow>
            )}
            {classes.map((c) => {
              const students = studentsByClass.get(c.id) ?? 0;
              const atRisk = atRiskByClass.get(c.id) ?? 0;
              const teachers = teachersByClass.get(c.id)?.size ?? 0;
              const subjects = subjectsByClass.get(c.id)?.size ?? 0;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/portal/admin/students?class=${c.id}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell>{LEVEL_LABEL[c.level] ?? c.level}</TableCell>
                  <TableCell>{students}</TableCell>
                  {/* Plain zero, not a badge, when there are none — a row of
                      "0" chips reads as a wall of alerts at a glance. */}
                  <TableCell>
                    {atRisk === 0 ? (
                      <span className="text-muted-foreground">0</span>
                    ) : (
                      <Badge variant="destructive">{atRisk}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{teachers}</TableCell>
                  <TableCell>{subjects}</TableCell>
                  <TableCell>
                    {c.gradingEnabled ? (
                      <Badge variant="success">Enabled</Badge>
                    ) : (
                      <Badge variant="outline">Not graded</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        Classes are read-only here on purpose. A class code feeds every admission number
        issued to that class (<span className="font-mono">SCIS/2026/JSS3/001</span>), and
        those numbers go on paper records the school keeps for years — changing one after
        students are enrolled would leave their printed numbers pointing at nothing. Adding
        or renaming a class is a change to the seed script.
      </p>
    </div>
  );
}
