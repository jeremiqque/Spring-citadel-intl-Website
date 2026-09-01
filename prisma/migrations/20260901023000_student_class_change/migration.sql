-- Promotion / demotion feature: a class's default promotion path, and an
-- audit trail of every class change a student goes through after enrolment.
-- See prisma/schema.prisma's comments on Class.promotesToClassId and
-- StudentClassChange for the reasoning.

ALTER TYPE "NotificationType" ADD VALUE 'STUDENT_CLASS_CHANGED';

CREATE TYPE "ClassChangeReason" AS ENUM ('PROMOTED', 'REPEATED', 'CORRECTED', 'GRADUATED', 'WITHDRAWN');

ALTER TABLE "Class" ADD COLUMN "promotesToClassId" TEXT;
ALTER TABLE "Class" ADD CONSTRAINT "Class_promotesToClassId_fkey" FOREIGN KEY ("promotesToClassId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StudentClassChange" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromClassId" TEXT NOT NULL,
    "toClassId" TEXT,
    "session" TEXT NOT NULL,
    "reason" "ClassChangeReason" NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentClassChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentClassChange_studentId_createdAt_idx" ON "StudentClassChange"("studentId", "createdAt");

ALTER TABLE "StudentClassChange" ADD CONSTRAINT "StudentClassChange_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentClassChange" ADD CONSTRAINT "StudentClassChange_fromClassId_fkey" FOREIGN KEY ("fromClassId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentClassChange" ADD CONSTRAINT "StudentClassChange_toClassId_fkey" FOREIGN KEY ("toClassId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
