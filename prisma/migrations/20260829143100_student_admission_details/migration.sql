-- Admission-form fields the paper "Application for Admission" form asks for
-- but the schema never captured: nationality, mother tongue, place of
-- birth, previous school, up to three siblings currently at the school, and
-- both parents' full details (distinct from guardianName/guardianPhone,
-- which stay as the one contact the rest of the app reads).
--
-- Additive and nullable throughout, so it applies to a populated table with
-- no backfill and no downtime — every existing student simply has none of
-- this on file yet, which is the truthful state.
ALTER TABLE "Student" ADD COLUMN "nationality" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherTongue" TEXT;
ALTER TABLE "Student" ADD COLUMN "placeOfBirth" TEXT;
ALTER TABLE "Student" ADD COLUMN "previousSchool" TEXT;

ALTER TABLE "Student" ADD COLUMN "sibling1Name" TEXT;
ALTER TABLE "Student" ADD COLUMN "sibling1Class" TEXT;
ALTER TABLE "Student" ADD COLUMN "sibling2Name" TEXT;
ALTER TABLE "Student" ADD COLUMN "sibling2Class" TEXT;
ALTER TABLE "Student" ADD COLUMN "sibling3Name" TEXT;
ALTER TABLE "Student" ADD COLUMN "sibling3Class" TEXT;

ALTER TABLE "Student" ADD COLUMN "fatherName" TEXT;
ALTER TABLE "Student" ADD COLUMN "fatherNationality" TEXT;
ALTER TABLE "Student" ADD COLUMN "fatherState" TEXT;
ALTER TABLE "Student" ADD COLUMN "fatherProfession" TEXT;
ALTER TABLE "Student" ADD COLUMN "fatherEmployer" TEXT;
ALTER TABLE "Student" ADD COLUMN "fatherPoBox" TEXT;
ALTER TABLE "Student" ADD COLUMN "fatherAddress" TEXT;
ALTER TABLE "Student" ADD COLUMN "fatherPhone" TEXT;
ALTER TABLE "Student" ADD COLUMN "fatherEmail" TEXT;

ALTER TABLE "Student" ADD COLUMN "motherName" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherNationality" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherState" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherProfession" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherEmployer" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherPoBox" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherAddress" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherPhone" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherEmail" TEXT;
