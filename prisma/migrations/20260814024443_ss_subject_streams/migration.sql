-- CreateEnum
CREATE TYPE "SubjectStream" AS ENUM ('CORE', 'SCIENCE', 'ARTS', 'COMMERCIAL');

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "compulsory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "streams" "SubjectStream"[];
