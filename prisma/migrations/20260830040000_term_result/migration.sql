-- Phase 2 of result management: the compiled termly result. See
-- docs/planning/result-management-and-attendance-plan.md.

-- New notification event: a student's result was published.
ALTER TYPE "NotificationType" ADD VALUE 'RESULT_PUBLISHED';

CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'COMPILED', 'PUBLISHED');

CREATE TABLE "TermResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "term" "Term" NOT NULL,
    "session" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "average" DOUBLE PRECISION NOT NULL,
    "position" INTEGER,
    "classSize" INTEGER,
    "attendancePresent" INTEGER,
    "attendanceTotal" INTEGER,
    "classTeacherRemark" TEXT,
    "principalRemark" TEXT,
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "compiledAt" TIMESTAMP(3),
    "compiledById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TermResult_studentId_term_session_key" ON "TermResult"("studentId", "term", "session");
CREATE INDEX "TermResult_classId_term_session_status_idx" ON "TermResult"("classId", "term", "session", "status");

ALTER TABLE "TermResult" ADD CONSTRAINT "TermResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TermResult" ADD CONSTRAINT "TermResult_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
