import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacher, teacherAssignments } from "@/lib/teacher";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

/**
 * My Classes — the roster view.
 *
 * The sidebar has linked here since the shell was built ("Most of these
 * hrefs don't resolve to a real page until a later package"). This is the
 * page: one card per class this teacher is assigned to, with the students in
 * it, and a link into grade entry for each subject they teach that class.
 *
 * Grouped BY CLASS rather than by assignment, because a teacher who teaches
 * two subjects to JSS 3 sees one JSS 3 with the same thirty children, not
 * two identical rosters. The dashboard is the by-assignment view.
 *
 * Read-only. Nothing here writes; the class list a teacher holds is set by
 * an admin on their staff profile.
 */
export default async function TeacherClassesPage() {
  const { teacherId } = await requireTeacher();
  const assignments = await teacherAssignments(teacherId);

  if (assignments.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">My classes</h1>
        <p className="text-sm text-muted-foreground">
          You have no classes assigned yet. An administrator assigns classes and subjects
          from your staff profile — once they do, they appear here.
        </p>
      </div>
    );
  }

  const classIds = [...new Set(assignments.map((a) => a.classId))];

  const [termSetting, students] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
    // One query for every roster, not one per class. INACTIVE students are
    // excluded — they are soft-deleted, and their historical grades survive
    // independently.
    prisma.student.findMany({
      where: { classId: { in: classIds }, status: { in: ["ACTIVE", "AT_RISK"] } },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const currentTerm = termSetting?.value ?? "TERM_1";

  const studentsByClass = new Map<string, typeof students>();
  for (const s of students) {
    const list = studentsByClass.get(s.classId) ?? [];
    list.push(s);
    studentsByClass.set(s.classId, list);
  }

  const classes = classIds.map((id) => {
    const forClass = assignments.filter((a) => a.classId === id);
    return {
      id,
      name: forClass[0].class.name,
      level: forClass[0].class.level,
      subjects: forClass.map((a) => ({ id: a.subjectId, name: a.subject.name })),
      roster: studentsByClass.get(id) ?? [],
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {classes.length} class{classes.length === 1 ? "" : "es"}, {students.length} students
        </p>
      </div>

      {classes.map((c) => (
        <section key={c.id} className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-medium text-foreground">{c.name}</h2>
            <span className="text-xs text-muted-foreground">
              {c.roster.length} student{c.roster.length === 1 ? "" : "s"}
            </span>
            <div className="flex flex-wrap gap-2">
              {c.subjects.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/portal/teacher/grades?pair=${c.id}|${sub.id}&term=${currentTerm}`}
                  className="rounded-md border border-border px-2 py-1 text-xs text-brand transition-colors hover:bg-muted"
                >
                  {sub.name} — enter grades
                </Link>
              ))}
            </div>
          </div>

          {c.roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
          ) : (
            <div className="rounded-lg border border-border">
              <Table caption={`Roster for ${c.name}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.roster.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                      <TableCell>{s.user.name}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "AT_RISK" ? "destructive" : "success"}>
                          {s.status === "AT_RISK" ? "At risk" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
