-- A notification type for "an administrator removed your profile photo".
--
-- Separate migration from the avatar columns on purpose: PostgreSQL will not
-- let a newly added enum value be USED in the same transaction that adds it,
-- and Prisma runs each migration file in one transaction. Adding the value
-- here, alone, keeps that rule satisfied no matter what a later migration
-- does with it.
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_PHOTO_REMOVED';
