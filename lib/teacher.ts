import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * The teacher-side authorisation primitives.
 *
 * ── WHY THESE EXIST AS FUNCTIONS AND NOT INLINE CHECKS ─────────────────────
 * The teacher grade-entry surface is the first place in this build where a
 * NON-ADMIN user writes data belonging to someone else. Everything before it
 * was either admin-only (middleware's role gate is sufficient) or self-scoped
 * (the student pages look their own row up from session.user.id and take no
 * id from the client at all).
 *
 * Grade entry is neither. A teacher legitimately writes rows for other
 * people's children, but only for the (class, subject) pairs they hold a
 * TeacherAssignment for — which the schema already calls out as "the
 * authorisation source ... that check runs server-side inside the action,
 * never in the UI."
 *
 * So there are exactly two questions, and they get exactly two functions,
 * used by every teacher page and every teacher action:
 *   requireTeacher()   — is this caller a teacher in good standing?
 *   requireAssignment() — may THIS teacher touch THIS (class, subject)?
 *
 * Both throw rather than returning null. A page that forgets to handle a
 * null gets a silent authorisation hole; a page that forgets to handle a
 * throw gets an error boundary. Fail loud.
 */

export class TeacherAuthError extends Error {}

export type TeacherIdentity = {
  teacherId: string;
  userId: string;
  name: string;
};

/**
 * Resolve the signed-in teacher.
 *
 * This deliberately re-runs BOTH halves of the portal layout's revocation
 * check, because the layout guards page RENDERS and a Server Action is a
 * live HTTP endpoint that can be invoked directly, without the page that
 * normally calls it ever having rendered:
 *
 *   status       — an ON_LEAVE or INACTIVE teacher holding a still-valid JWT
 *   tokenVersion — a teacher whose sessions were revoked (password reset,
 *                  deactivation) holding a still-valid JWT
 *
 * Checking only the first was the bug this comment used to describe half of.
 * A stolen laptop whose sessions an admin had already revoked was bounced
 * off every page and could still POST grades to every class that teacher
 * held, for up to the JWT's full 30-day life. Revocation that only applies
 * to reads is not revocation.
 */
export async function requireTeacher(): Promise<TeacherIdentity> {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    throw new TeacherAuthError("Forbidden");
  }

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      status: true,
      user: { select: { id: true, name: true, tokenVersion: true } },
    },
  });

  // ACTIVE only, not "not INACTIVE" — same rule as auth.ts's login gate.
  // ON_LEAVE keeps the account and blocks the work.
  if (!teacher || teacher.status !== "ACTIVE") {
    throw new TeacherAuthError("Forbidden");
  }

  // Session revocation. `tokenVersion` on the row is the live value; the one
  // on the session is a snapshot from sign-in. Any mismatch means the account
  // was reset or deactivated after this token was issued. Compared the same
  // way app/portal/(app)/layout.tsx compares them, including the `?? 0`
  // default for tokens minted before the claim existed.
  if (teacher.user.tokenVersion !== (session.user.tokenVersion ?? 0)) {
    throw new TeacherAuthError("Forbidden");
  }

  return { teacherId: teacher.id, userId: teacher.user.id, name: teacher.user.name };
}

/**
 * THE ownership check.
 *
 * A teacher may only write grades for a (class, subject) pair they hold a
 * TeacherAssignment row for. This is the single line that makes the admin
 * action's comment — "the same action, without the ownership check" —
 * literally true: the admin action calls upsertGrade() directly, this path
 * calls this first.
 *
 * It also re-verifies gradingEnabled on the class. Early Years and Primary
 * have no agreed assessment scheme, so a grade row for them is meaningless
 * data the school never asked for; the UI never offers those classes, and
 * this is what makes that true of the endpoint too.
 */
export async function requireAssignment(
  teacherId: string,
  classId: string,
  subjectId: string
) {
  const assignment = await prisma.teacherAssignment.findUnique({
    where: { teacherId_classId_subjectId: { teacherId, classId, subjectId } },
    select: { id: true, class: { select: { id: true, name: true, gradingEnabled: true } } },
  });

  if (!assignment) {
    throw new TeacherAuthError("You are not assigned to this class and subject.");
  }
  if (!assignment.class.gradingEnabled) {
    throw new TeacherAuthError("Grade entry is not enabled for this class.");
  }

  return assignment;
}

/**
 * Every (class, subject) pair this teacher holds, with the class and subject
 * loaded. Shared by the dashboard, My Classes and the grade-entry picker so
 * the three screens can never disagree about what a teacher is allowed to
 * see — which would be the first symptom of an authorisation bug.
 *
 * Filtered to gradingEnabled classes for the same reason requireAssignment()
 * checks it.
 */
export async function teacherAssignments(teacherId: string) {
  return prisma.teacherAssignment.findMany({
    where: { teacherId, class: { gradingEnabled: true } },
    include: { class: true, subject: true },
    orderBy: [{ class: { level: "asc" } }, { class: { name: "asc" } }, { subject: { name: "asc" } }],
  });
}
