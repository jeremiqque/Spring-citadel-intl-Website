import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;
type TermValue = "TERM_1" | "TERM_2" | "TERM_3";
type StatusValue = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

/**
 * The one place an Attendance row is ever written — same shape as
 * lib/psychomotor.ts's upsertPsychomotorRating() and lib/grades.ts's
 * upsertGrade(): the form teacher's per-row action and the admin's override
 * action both call this, so the two can never drift.
 *
 * No draft/submit lifecycle here, unlike Grade and PsychomotorRating — a
 * day's mark is either recorded or it isn't, and correcting a mismarked day
 * is a normal, always-available action rather than something that needs an
 * admin escalation. That matches how a paper attendance register actually
 * works: today's page is editable until it isn't needed anymore, there is
 * no "submit" step.
 */
export async function upsertAttendance(
  db: Db,
  params: {
    studentId: string;
    classId: string;
    term: TermValue;
    session: string;
    date: Date;
    status: StatusValue;
    markedById: string;
  }
) {
  return db.attendance.upsert({
    where: { studentId_date: { studentId: params.studentId, date: params.date } },
    update: {
      classId: params.classId,
      term: params.term,
      session: params.session,
      status: params.status,
      markedById: params.markedById,
    },
    create: {
      studentId: params.studentId,
      classId: params.classId,
      term: params.term,
      session: params.session,
      date: params.date,
      status: params.status,
      markedById: params.markedById,
    },
  });
}

/**
 * "Default everyone to PRESENT with one click, then flip exceptions" — the
 * plan's own description of the register UX. Deliberately non-destructive:
 * only creates a row for a student who doesn't already have one for that
 * date, via createMany's skipDuplicates rather than a loop of upserts, so a
 * second click (or a click after a few rows were already hand-marked) can
 * never overwrite a correction someone already made. Returns how many rows
 * it actually created.
 */
export async function markClassPresentByDefault(
  db: Db,
  params: {
    classId: string;
    term: TermValue;
    session: string;
    date: Date;
    markedById: string;
    studentIds: string[];
  }
): Promise<number> {
  if (params.studentIds.length === 0) return 0;

  const result = await db.attendance.createMany({
    data: params.studentIds.map((studentId) => ({
      studentId,
      classId: params.classId,
      term: params.term,
      session: params.session,
      date: params.date,
      status: "PRESENT" as const,
      markedById: params.markedById,
    })),
    skipDuplicates: true,
  });

  return result.count;
}
