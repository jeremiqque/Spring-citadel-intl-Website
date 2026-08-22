-- ---------------------------------------------------------------------------
-- Database-level integrity constraints.
--
-- Prisma's schema language cannot express CHECK constraints or generated
-- columns, so these are applied as raw SQL. Run this AFTER the migration that
-- adds tokenVersion and the new indexes:
--
--     npx prisma migrate dev --name hardening
--     npx prisma db execute --file prisma/sql/constraints.sql --schema prisma/schema.prisma
--
-- Every statement is idempotent, so re-running is safe.
--
-- WHY: all three of these rules currently live only in Zod, in one code path.
-- lib/grades.ts's upsertGrade() is exported, takes three raw numbers and
-- checks none of them — today's single caller validates, but the teacher-side
-- grade entry that has not been built yet will be the second, and
-- scoreToLetter(300) happily returns "A". A constraint in the database is the
-- only version of a rule that a future code path cannot forget.
-- ---------------------------------------------------------------------------

-- ── Score bounds — the 20/30/50 assessment split ───────────────────────────
ALTER TABLE "Grade" DROP CONSTRAINT IF EXISTS "grade_assignment_range";
ALTER TABLE "Grade" ADD CONSTRAINT "grade_assignment_range"
  CHECK ("assignment" >= 0 AND "assignment" <= 20);

ALTER TABLE "Grade" DROP CONSTRAINT IF EXISTS "grade_midterm_range";
ALTER TABLE "Grade" ADD CONSTRAINT "grade_midterm_range"
  CHECK ("midterm" >= 0 AND "midterm" <= 30);

ALTER TABLE "Grade" DROP CONSTRAINT IF EXISTS "grade_exam_range";
ALTER TABLE "Grade" ADD CONSTRAINT "grade_exam_range"
  CHECK ("exam" >= 0 AND "exam" <= 50);

-- ── total must equal its components ────────────────────────────────────────
-- `total` is the column every average, KPI and class comparison reads. It is
-- written by one function today, but nothing stopped it drifting from the
-- three numbers it claims to sum — a partial update or any SQL fix-up left it
-- permanently wrong with no way to detect it.
--
-- A CHECK rather than GENERATED ALWAYS AS: converting the existing column to
-- generated requires dropping and re-adding it, which Prisma would then see
-- as drift on the next migrate. The constraint gives the same guarantee.
ALTER TABLE "Grade" DROP CONSTRAINT IF EXISTS "grade_total_is_sum";
ALTER TABLE "Grade" ADD CONSTRAINT "grade_total_is_sum"
  CHECK ("total" = "assignment" + "midterm" + "exam");

-- ── A submitted grade must have a submission timestamp ─────────────────────
ALTER TABLE "Grade" DROP CONSTRAINT IF EXISTS "grade_submitted_has_timestamp";
ALTER TABLE "Grade" ADD CONSTRAINT "grade_submitted_has_timestamp"
  CHECK ("status" <> 'SUBMITTED' OR "submittedAt" IS NOT NULL);

-- ── Session label format ───────────────────────────────────────────────────
-- `session` is a bare string that is part of Grade's unique key. A typo does
-- not error, it files the row under a session nothing ever queries again.
-- The app now validates this in Zod; this is the backstop for every other
-- write path.
ALTER TABLE "Grade" DROP CONSTRAINT IF EXISTS "grade_session_format";
ALTER TABLE "Grade" ADD CONSTRAINT "grade_session_format"
  CHECK ("session" ~ '^[0-9]{4}/[0-9]{4}$');

-- ── Case-insensitive search support ────────────────────────────────────────
-- The student and teacher list screens use `contains` with mode:"insensitive",
-- which compiles to ILIKE '%q%'. No B-tree can serve an unanchored ILIKE, so
-- both screens sequentially scan — twice per page load, once for the rows and
-- once for the count. Trigram indexes make them index scans.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "user_name_trgm" ON "User" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "student_admissionno_trgm" ON "Student" USING gin ("admissionNo" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "teacher_staffid_trgm" ON "Teacher" USING gin ("staffId" gin_trgm_ops);

-- ── Partial index for the unread-notification badge ────────────────────────
-- Counted on EVERY authenticated render. The existing [userId, readAt] index
-- covers it, but a partial index over just the unread rows is a fraction of
-- the size and stays small as read notifications accumulate.
CREATE INDEX IF NOT EXISTS "notification_unread"
  ON "Notification" ("userId") WHERE "readAt" IS NULL;
