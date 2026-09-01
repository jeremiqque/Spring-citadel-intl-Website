-- One-off cleanup: drops a "guardianEmail" column that was applied to the
-- database by a migration whose local file no longer exists
-- (20260831070000_student_guardian_email), and removes that migration's
-- row from Prisma's own history table. `prisma migrate resolve
-- --rolled-back` only works on a migration stuck in a FAILED state — this
-- one finished successfully, so its history row has to be cleared directly
-- instead. Both statements are idempotent (IF EXISTS), so it's safe to run
-- this more than once. schema.prisma has no guardianEmail field, and the
-- guardian-email feature was deferred, so this brings the database back in
-- line with what's actually tracked. Safe to delete this file after running
-- it once.
ALTER TABLE "Student" DROP COLUMN IF EXISTS "guardianEmail";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20260831070000_student_guardian_email';
