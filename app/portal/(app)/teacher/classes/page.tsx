import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  PencilEdit02Icon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";

import { prisma } from "@/lib/prisma";
import { requireTeacher, teacherAssignments } from "@/lib/teacher";
import { submissionStatusFromCounts, type SubmissionStatus } from "@/lib/grades";
import { parseTerm } from "@/lib/validation/id";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Surface, SurfaceHeader, EmptyState } from "@/components/ui/surface";
import { Stat, StatGroup } from "@/components/ui/stat";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

function submissionBadge(status: SubmissionStatus): "success" | "warning" | "outline" {
  if (status === "Submitted") return "success";
  if (status === "In progress") return "warning";
  return "outline";
}

/**
 * My Classes — the roster view.
 *
 * Grouped BY CLASS rather than by assignment, because a teacher who teaches
 * two subjects to JSS 3 sees one JSS 3 with the same thirty children, not
 * two identical rosters. The dashboard is the by-assignment view.
 *
 * ── WHAT CHANGED, AND WHY ──────────────────────────────────────────────────
 * This page used to be a flat stack of six identical tables. Everything on
 * it was the same weight: the class name was `text-sm`, the same size as the
 * body copy under it; the "enter grades" link — the only action on the whole
 * screen — was a 12px bordered chip, visually the quietest element present;
 * and each roster floated on the page background with no container, so six
 * classes read as one continuous eighteen-row table with headings dropped
 * into it. There was no anchor for the eye and no route through the page.
 *
 * Three UX-driven changes, all inside the existing token set:
 *
 *   1. Each class is now a CARD. Containment is what makes six things read
 *      as six things. The class name moves up to the card-title rung and
 *      carries its level as an overline, so scanning for "SS 2" is a
 *      one-fixation job instead of a read.
 *
 *   2. The page now answers the question a teacher actually arrives with.
 *      A roster tells you WHO is in the class; it never told you whether you
 *      had marked them. That is the single fact this screen exists next to
 *      grade entry to support, and it was absent. The summary strip at the
 *      top and the per-subject status pill on each card come from the SAME
 *      submissionStatusFromCounts() the dashboard and the admin's teacher
 *      profile use, so "In progress" means one thing across all three
 *      screens rather than three.
 *
 *   3. "Enter grades" is a real Button. It is the primary action of the
 *      card and now looks like it; the class it lives in is stated by the
 *      card, so the label no longer has to repeat the subject name in a
 *      sentence-long link ("English Language — enter grades").
 *
 * Query cost is unchanged in shape: the extra submission data is ONE grouped
 * aggregate for every class at once, matching the dashboard's pattern
 * deliberately — not a count per assignment in a loop.
 *
 * Read-only. Nothing here writes; the class list a teacher holds is set by
 * an admin on their staff profile.
 */
export default async function TeacherClassesPage() {
  const { teacherId } = await requireTeacher();
  const assignments = await teacherAssignments(teacherId);

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="My classes" />
        <Surface padding="none">
          <EmptyState
            icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />}
            title="No classes assigned yet"
          >
            An administrator assigns classes and subjects from your staff profile — once
            they do, they appear here.
          </EmptyState>
        </Surface>
      </div>
    );
  }

  const classIds = [...new Set(assignments.map((a) => a.classId))];

  const [sessionSetting, termSetting, students] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
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

  const currentSession = sessionSetting?.value ?? "";
  // Parsed, not cast: a hand-edited Setting row would otherwise throw inside
  // the Prisma `where` below and blank the page.
  const currentTerm: TermValue = parseTerm(termSetting?.value) ?? "TERM_1";

  // One grouped aggregate covering every (class, subject) this teacher holds.
  // The naive shape — a count per assignment inside Promise.all — fires two
  // queries per pair into a connection pool five to nine wide and queues on
  // itself; cost here is flat however many classes they teach.
  const submittedThisTerm =
    currentSession !== ""
      ? await prisma.grade.groupBy({
          by: ["classId", "subjectId"],
          where: {
            teacherId,
            classId: { in: classIds },
            session: currentSession,
            term: currentTerm,
            status: "SUBMITTED",
          },
          _count: { _all: true },
        })
      : [];

  const submittedByPair = new Map(
    submittedThisTerm.map((r) => [`${r.classId}:${r.subjectId}`, r._count._all])
  );

  const studentsByClass = new Map<string, typeof students>();
  for (const s of students) {
    const list = studentsByClass.get(s.classId) ?? [];
    list.push(s);
    studentsByClass.set(s.classId, list);
  }

  const classes = classIds.map((id) => {
    const forClass = assignments.filter((a) => a.classId === id);
    const roster = studentsByClass.get(id) ?? [];
    return {
      id,
      name: forClass[0].class.name,
      level: forClass[0].class.level,
      subjects: forClass.map((a) => {
        const submitted = submittedByPair.get(`${id}:${a.subjectId}`) ?? 0;
        return {
          id: a.subjectId,
          name: a.subject.name,
          submitted,
          status: submissionStatusFromCounts(roster.length, submitted),
        };
      }),
      roster,
      atRisk: roster.filter((s) => s.status === "AT_RISK").length,
    };
  });

  const allSubjects = classes.flatMap((c) => c.subjects);
  const outstanding = allSubjects.filter((s) => s.status !== "Submitted").length;
  const atRiskTotal = classes.reduce((n, c) => n + c.atRisk, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${currentSession ? `${currentSession} · ` : ""}${currentTerm.replace("_", " ")}`}
        title="My classes"
        description="Every class you teach, who is in it, and how far through marking you are this term."
      />

      {/* The summary strip. Four figures a teacher can act on, in the order
          they'd ask for them: how much am I responsible for, how much is
          left, and is anyone in trouble. "Still to mark" is deliberately the
          only figure with a warning tone — it is the one that implies work. */}
      <StatGroup>
        <Stat label="Classes" value={classes.length} />
        <Stat label="Students" value={students.length} />
        <Stat
          label="Still to mark"
          value={outstanding}
          tone={outstanding > 0 ? "warning" : "success"}
          hint={`of ${allSubjects.length}`}
        />
        <Stat label="At risk" value={atRiskTotal} tone={atRiskTotal > 0 ? "danger" : "neutral"} />
      </StatGroup>

      {classes.map((c) => (
        <Surface key={c.id} padding="none">
          <section>
            <SurfaceHeader
              actions={c.subjects.map((sub) => (
                <Button
                  key={sub.id}
                  asChild
                  size="sm"
                  variant={sub.status === "Submitted" ? "outline" : "default"}
                >
                  <Link
                    href={`/portal/teacher/grades?pair=${c.id}|${sub.id}&term=${currentTerm}`}
                  >
                    <HugeiconsIcon icon={PencilEdit02Icon} aria-hidden />
                    {/* The subject name only when the teacher holds more
                        than one for this class — with a single subject the
                        card header already names it, and repeating it turns
                        the button into a sentence. */}
                    {c.subjects.length > 1 ? `${sub.name} grades` : "Enter grades"}
                  </Link>
                </Button>
              ))}
            >
              <div className="min-w-0">
                <p className="text-2xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  {c.level}
                </p>
                <h2 className="text-lg leading-heading font-semibold text-foreground">{c.name}</h2>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <HugeiconsIcon icon={UserGroupIcon} size={14} aria-hidden />
                {c.roster.length} student{c.roster.length === 1 ? "" : "s"}
              </span>
              {c.atRisk > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <HugeiconsIcon icon={Alert02Icon} size={14} aria-hidden />
                  {c.atRisk} at risk
                </span>
              )}
              {/* Marking status per subject. A pill rather than a sentence
                  because there can be several, and because the same pill
                  vocabulary (success / warning / outline) already means
                  exactly this on the dashboard. */}
              {c.subjects.map((sub) => (
                <Badge key={sub.id} variant={submissionBadge(sub.status)}>
                  {c.subjects.length > 1 ? `${sub.name}: ` : ""}
                  {sub.status}
                </Badge>
              ))}
            </SurfaceHeader>

            {c.roster.length === 0 ? (
              <EmptyState
                compact
                icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />}
                title="No students enrolled yet"
              >
                Once an administrator enrols students into {c.name}, their names appear here
                and the class becomes markable.
              </EmptyState>
            ) : (
              <Table caption={`Roster for ${c.name}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Admission No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="pr-5 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.roster.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="pl-5 font-mono text-xs text-muted-foreground">
                        {s.admissionNo}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{s.user.name}</TableCell>
                      <TableCell className="pr-5 text-right">
                        <Badge variant={s.status === "AT_RISK" ? "destructive" : "success"}>
                          {s.status === "AT_RISK" ? "At risk" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </Surface>
      ))}
    </div>
  );
}
