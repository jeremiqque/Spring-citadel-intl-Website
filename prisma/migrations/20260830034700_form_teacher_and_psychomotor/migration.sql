-- Phase 1 of result management: a class's one form/class teacher, and the
-- psychomotor/affective ratings they own. See docs/planning/
-- result-management-and-attendance-plan.md for the full design.

-- Class.formTeacherId — nullable (existing classes have none until an admin
-- assigns one) and unique (a teacher is form teacher of at most one class;
-- enforced here, not just in the UI).
ALTER TABLE "Class" ADD COLUMN "formTeacherId" TEXT;
CREATE UNIQUE INDEX "Class_formTeacherId_key" ON "Class"("formTeacherId");
ALTER TABLE "Class" ADD CONSTRAINT "Class_formTeacherId_fkey" FOREIGN KEY ("formTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PsychomotorRating — one row per student per term, reusing the GradeStatus
-- enum (DRAFT/SUBMITTED) for the same draft/submit/visibility lifecycle
-- Grade already has.
CREATE TABLE "PsychomotorRating" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "term" "Term" NOT NULL,
    "session" TEXT NOT NULL,
    "punctuality" INTEGER NOT NULL,
    "neatness" INTEGER NOT NULL,
    "honesty" INTEGER NOT NULL,
    "leadership" INTEGER NOT NULL,
    "cooperation" INTEGER NOT NULL,
    "handwriting" INTEGER NOT NULL,
    "sports" INTEGER NOT NULL,
    "remark" TEXT,
    "ratedById" TEXT NOT NULL,
    "status" "GradeStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychomotorRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PsychomotorRating_studentId_term_session_key" ON "PsychomotorRating"("studentId", "term", "session");
CREATE INDEX "PsychomotorRating_classId_term_session_idx" ON "PsychomotorRating"("classId", "term", "session");

ALTER TABLE "PsychomotorRating" ADD CONSTRAINT "PsychomotorRating_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PsychomotorRating" ADD CONSTRAINT "PsychomotorRating_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PsychomotorRating" ADD CONSTRAINT "PsychomotorRating_ratedById_fkey" FOREIGN KEY ("ratedById") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
