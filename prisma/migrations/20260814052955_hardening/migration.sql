-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_studentId_fkey";

-- DropIndex
DROP INDEX "Grade_status_idx";

-- DropIndex
DROP INDEX "Grade_studentId_idx";

-- DropIndex
DROP INDEX "Student_classId_idx";

-- DropIndex
DROP INDEX "TeacherAssignment_teacherId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Grade_session_term_status_idx" ON "Grade"("session", "term", "status");

-- CreateIndex
CREATE INDEX "Grade_status_submittedAt_idx" ON "Grade"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "Grade_classId_subjectId_teacherId_status_idx" ON "Grade"("classId", "subjectId", "teacherId", "status");

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
