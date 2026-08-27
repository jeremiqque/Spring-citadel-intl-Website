-- Student.contactPhone — the one self-editable field on a student's record.
--
-- Additive and nullable, so it applies to a populated table with no backfill
-- and no downtime: every existing row simply has no personal number yet,
-- which is the truthful state (the office has never collected one).
-- Deliberately NOT NOT-NULL with a default — an empty string would be
-- indistinguishable from "the student chose not to give one".
ALTER TABLE "Student" ADD COLUMN "contactPhone" TEXT;
