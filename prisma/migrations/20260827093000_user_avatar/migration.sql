-- Profile pictures, stored inline in Postgres.
--
-- All three columns are nullable and additive, so this applies to a populated
-- User table with no backfill and no downtime: every existing account simply
-- has no photo, which is the truthful state and is exactly what the
-- initial-letter fallback already renders.
--
-- No index. This column is only ever read by primary key, from the avatar
-- serving route, and is never a filter or a sort key.
ALTER TABLE "User" ADD COLUMN "avatar" BYTEA;
ALTER TABLE "User" ADD COLUMN "avatarType" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarUpdatedAt" TIMESTAMP(3);
