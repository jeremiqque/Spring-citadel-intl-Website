-- ---------------------------------------------------------------------------
-- Pre-flight check. Run BEFORE constraints.sql:
--
--     npx prisma db execute --file prisma/sql/preflight.sql --schema prisma/schema.prisma
--
-- Read-only. ALTER TABLE ... ADD CONSTRAINT validates against every existing
-- row and FAILS if any of them violate it, so this reports what would break
-- before you try.
--
-- The likely offenders are historical: grades written under session = "" before
-- the guard was added, and submitted rows whose submittedAt was never set.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  bad_session   bigint;
  bad_total     bigint;
  bad_timestamp bigint;
  bad_scores    bigint;
  total_rows    bigint;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE "session" !~ '^[0-9]{4}/[0-9]{4}$'),
    count(*) FILTER (WHERE "total" <> "assignment" + "midterm" + "exam"),
    count(*) FILTER (WHERE "status" = 'SUBMITTED' AND "submittedAt" IS NULL),
    count(*) FILTER (WHERE "assignment" NOT BETWEEN 0 AND 20
                        OR "midterm"    NOT BETWEEN 0 AND 30
                        OR "exam"       NOT BETWEEN 0 AND 50)
  INTO total_rows, bad_session, bad_total, bad_timestamp, bad_scores
  FROM "Grade";

  RAISE NOTICE '--------------------------------------------------';
  RAISE NOTICE 'Grade rows total .................. %', total_rows;
  RAISE NOTICE 'Bad session label ................. %', bad_session;
  RAISE NOTICE 'total <> assignment+midterm+exam .. %', bad_total;
  RAISE NOTICE 'SUBMITTED with no submittedAt ..... %', bad_timestamp;
  RAISE NOTICE 'Score outside its 20/30/50 range .. %', bad_scores;
  RAISE NOTICE '--------------------------------------------------';

  IF bad_session + bad_total + bad_timestamp + bad_scores = 0 THEN
    RAISE NOTICE 'CLEAN - constraints.sql will apply without error.';
  ELSE
    RAISE NOTICE 'NOT CLEAN - fix the rows above before running constraints.sql.';
  END IF;

  -- Show the offending session labels, since that is the one that usually
  -- needs a judgement call about which session the rows really belong to.
  IF bad_session > 0 THEN
    RAISE NOTICE 'Offending session labels:';
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT "session" AS label, count(*) AS n
        FROM "Grade"
        WHERE "session" !~ '^[0-9]{4}/[0-9]{4}$'
        GROUP BY "session"
      LOOP
        RAISE NOTICE '  "%"  ->  % row(s)', r.label, r.n;
      END LOOP;
    END;
  END IF;
END $$;
