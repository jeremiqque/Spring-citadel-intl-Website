import { prisma } from "@/lib/prisma";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

export type CompileReadiness =
  | { ready: true; studentCount: number }
  | { ready: false; reason: string };

/**
 * Can this class/term/session be compiled right now?
 *
 * Deliberately NOT "every subject the class offers has a submitted grade
 * for every student" — SS classes have per-student elective sets
 * (Subject.streams), so there is no single "every expected subject" list
 * that applies to every student in an SS class the way it does in JSS. The
 * rule that actually generalises to both: no student may have an
 * unsubmitted (DRAFT) grade sitting in this term/session, and every active
 * student must have at least one SUBMITTED grade to average — an unrated
 * student can't be compiled into a result at all, let alone a ranked one.
 */
export async function checkCompileReadiness(
  classId: string,
  term: TermValue,
  session: string
): Promise<CompileReadiness> {
  const students = await prisma.student.findMany({
    where: { classId, status: { in: ["ACTIVE", "AT_RISK"] } },
    select: { id: true },
  });
  if (students.length === 0) {
    return { ready: false, reason: "No active students are enrolled in this class." };
  }

  const grades = await prisma.grade.findMany({
    where: { studentId: { in: students.map((s) => s.id) }, term, session },
    select: { studentId: true, status: true },
  });

  const draftCount = grades.filter((g) => g.status === "DRAFT").length;
  if (draftCount > 0) {
    return {
      ready: false,
      reason: `${draftCount} grade${draftCount === 1 ? "" : "s"} in this class are still drafts — every entered grade must be submitted before compiling.`,
    };
  }

  const submittedByStudent = new Map<string, number>();
  for (const g of grades) {
    if (g.status === "SUBMITTED") {
      submittedByStudent.set(g.studentId, (submittedByStudent.get(g.studentId) ?? 0) + 1);
    }
  }
  const ungraded = students.filter((s) => !submittedByStudent.get(s.id)).length;
  if (ungraded > 0) {
    return {
      ready: false,
      reason: `${ungraded} student${ungraded === 1 ? " has" : "s have"} no submitted grades yet for this term.`,
    };
  }

  return { ready: true, studentCount: students.length };
}

export type TermPublishSummary = {
  totalClasses: number;
  /** Class names with at least one non-PUBLISHED TermResult, or none
   *  compiled at all yet, for this term/session — the classes a "Heads up"
   *  banner would name when an admin is about to leave this term behind. */
  pendingClassNames: string[];
};

/**
 * A school-wide readiness summary for one term/session, used only for the
 * "advance to the next term" warning on the Settings page (see
 * settings-forms.tsx) — NOT a gate. checkCompileReadiness above answers "can
 * THIS class be compiled" for the compile button on the results page; this
 * answers "how many of ALL the gradeable classes have actually reached
 * PUBLISHED" for one term, so an admin moving the school's current term
 * forward can see what they're leaving unfinished without being blocked by
 * it (see the decision behind assertCurrentTerm in lib/academic-period.ts —
 * the admin's judgement call, not a hard rule enforced here).
 *
 * A class counts as "done" only if EVERY TermResult row it has for this
 * term/session is PUBLISHED — a class with a lingering DRAFT or COMPILED
 * result (partially reviewed, or compiled but not yet published) still
 * shows up as pending, same as a class with no TermResult rows at all
 * (never compiled).
 */
export async function getTermPublishSummary(
  session: string,
  term: TermValue
): Promise<TermPublishSummary> {
  const gradedClasses = await prisma.class.findMany({
    where: { gradingEnabled: true },
    select: { id: true, name: true },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });
  if (gradedClasses.length === 0) {
    return { totalClasses: 0, pendingClassNames: [] };
  }

  const results = await prisma.termResult.findMany({
    where: { session, term, classId: { in: gradedClasses.map((c) => c.id) } },
    select: { classId: true, status: true },
  });

  const statusesByClass = new Map<string, string[]>();
  for (const r of results) {
    const list = statusesByClass.get(r.classId) ?? [];
    list.push(r.status);
    statusesByClass.set(r.classId, list);
  }

  const pendingClassNames = gradedClasses
    .filter((c) => {
      const statuses = statusesByClass.get(c.id) ?? [];
      const allPublished = statuses.length > 0 && statuses.every((s) => s === "PUBLISHED");
      return !allPublished;
    })
    .map((c) => c.name);

  return { totalClasses: gradedClasses.length, pendingClassNames };
}

export type CompileResult =
  | { ok: true; compiled: number }
  | { ok: false; error: string };

/**
 * The compile step — "the admin generates the result," in code.
 *
 * Sums each student's SUBMITTED Grade.total for the term, ranks the class,
 * and upserts a TermResult row per student at status COMPILED. Nothing here
 * is invented data: every number comes from Grade rows that already exist
 * and passed checkCompileReadiness() above.
 *
 * Ranking: standard competition ranking (1, 2, 2, 4 — a tie shares a rank,
 * and the next rank skips by the tie's size), computed on average score
 * descending. Skipped entirely for SS classes, per the school's own
 * decision that a single class rank isn't meaningful once subject streams
 * mean students aren't all sitting the same subjects — `position` and
 * `classSize` are left null for every SS student, permanently, not just
 * until a future phase adds stream-aware ranking.
 *
 * classTeacherRemark is pre-filled from the form teacher's
 * PsychomotorRating.remark when one exists, purely as a starting point —
 * admin review (Phase 2's UI) can still edit it before publishing.
 */
export async function compileClassResults(
  classId: string,
  term: TermValue,
  session: string,
  compiledById: string
): Promise<CompileResult> {
  const readiness = await checkCompileReadiness(classId, term, session);
  if (!readiness.ready) {
    return { ok: false, error: readiness.reason };
  }

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { level: true } });
  if (!cls) {
    return { ok: false, error: "Class not found." };
  }
  const rankable = cls.level !== "SS";

  const students = await prisma.student.findMany({
    where: { classId, status: { in: ["ACTIVE", "AT_RISK"] } },
    select: { id: true },
  });

  const [grades, ratings, attendance] = await Promise.all([
    prisma.grade.findMany({
      where: { studentId: { in: students.map((s) => s.id) }, term, session, status: "SUBMITTED" },
      select: { studentId: true, total: true },
    }),
    prisma.psychomotorRating.findMany({
      where: { studentId: { in: students.map((s) => s.id) }, term, session },
      select: { studentId: true, remark: true },
    }),
    // Phase 4. EXCUSED days count toward neither side of the fraction — a
    // school-approved absence shouldn't drag a student's attendance rate
    // down the way an unexplained one does. LATE counts as attended: the
    // student was there for the day, just not on time. This is the one
    // place that reads Attendance rows into anything result-facing; the
    // register itself (app/portal/(app)/{admin,teacher}/attendance) is the
    // only place they're written.
    prisma.attendance.findMany({
      where: { studentId: { in: students.map((s) => s.id) }, term, session },
      select: { studentId: true, status: true },
    }),
  ]);

  const remarkByStudent = new Map(ratings.map((r) => [r.studentId, r.remark]));

  const attendanceByStudent = new Map<string, { present: number; total: number }>();
  for (const a of attendance) {
    const bucket = attendanceByStudent.get(a.studentId) ?? { present: 0, total: 0 };
    if (a.status !== "EXCUSED") {
      bucket.total += 1;
      if (a.status === "PRESENT" || a.status === "LATE") bucket.present += 1;
    }
    attendanceByStudent.set(a.studentId, bucket);
  }

  const totals = students.map((s) => {
    const rows = grades.filter((g) => g.studentId === s.id);
    const totalScore = rows.reduce((sum, g) => sum + g.total, 0);
    const average = rows.length > 0 ? totalScore / rows.length : 0;
    return { studentId: s.id, totalScore, average };
  });

  // Competition ranking, average descending.
  const ranked = [...totals].sort((a, b) => b.average - a.average);
  const positionByStudent = new Map<string, number>();
  if (rankable) {
    let rank = 0;
    let seen = 0;
    let lastAverage: number | null = null;
    for (const row of ranked) {
      seen += 1;
      if (lastAverage === null || row.average !== lastAverage) {
        rank = seen;
        lastAverage = row.average;
      }
      positionByStudent.set(row.studentId, rank);
    }
  }

  const now = new Date();
  try {
    await prisma.$transaction(
      totals.map((row) => {
        const days = attendanceByStudent.get(row.studentId);
        return prisma.termResult.upsert({
          where: { studentId_term_session: { studentId: row.studentId, term, session } },
          update: {
            classId,
            totalScore: row.totalScore,
            average: row.average,
            position: rankable ? positionByStudent.get(row.studentId) ?? null : null,
            classSize: rankable ? students.length : null,
            attendancePresent: days?.present ?? null,
            attendanceTotal: days?.total ?? null,
            classTeacherRemark: remarkByStudent.get(row.studentId) ?? undefined,
            status: "COMPILED",
            compiledAt: now,
            compiledById,
          },
          create: {
            studentId: row.studentId,
            classId,
            term,
            session,
            totalScore: row.totalScore,
            average: row.average,
            position: rankable ? positionByStudent.get(row.studentId) ?? null : null,
            classSize: rankable ? students.length : null,
            attendancePresent: days?.present ?? null,
            attendanceTotal: days?.total ?? null,
            classTeacherRemark: remarkByStudent.get(row.studentId) ?? null,
            status: "COMPILED",
            compiledAt: now,
            compiledById,
          },
        });
      })
    );
  } catch (err) {
    console.error("compileClassResults failed:", err);
    return { ok: false, error: "Could not compile results. Please try again." };
  }

  return { ok: true, compiled: totals.length };
}

/**
 * Called from lib/grades.ts's upsertGrade() after a grade write. If the
 * student already has a COMPILED or PUBLISHED TermResult for this
 * term/session, that result is now stale — it was computed from a set of
 * grades that has since changed. Rather than silently keep serving the old
 * average/position (or worse, a PUBLISHED one a parent may have already
 * seen), flip it back to DRAFT and clear the numbers a re-compile would
 * recompute anyway. This forces a deliberate re-compile + re-publish rather
 * than a rank quietly going stale.
 */
export async function invalidateTermResultIfStale(
  studentId: string,
  term: TermValue,
  session: string
) {
  const existing = await prisma.termResult.findUnique({
    where: { studentId_term_session: { studentId, term, session } },
    select: { status: true },
  });
  if (!existing || existing.status === "DRAFT") return;

  await prisma.termResult.update({
    where: { studentId_term_session: { studentId, term, session } },
    data: {
      status: "DRAFT",
      position: null,
      classSize: null,
      compiledAt: null,
      compiledById: null,
      publishedAt: null,
    },
  });
}
