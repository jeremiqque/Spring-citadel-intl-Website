import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Accepts either the global singleton or a `tx` handed in from inside
// prisma.$transaction(...) — callers that need the counter increment to
// commit or roll back atomically with the row they're creating (e.g.
// enrolling a student) pass their `tx`; callers that don't have one yet
// (the seed script's own inline logic aside) can omit it entirely.
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Race-safe sequence numbers for admission and staff IDs.
 *
 * Never `count() + 1` — two admins enrolling at the same moment would both
 * read the same count and mint the same number, and these numbers go on
 * paper records (admission letters, staff files) the school keeps for years.
 * Each call increments a Counter row inside a single atomic upsert and
 * returns the new value, so concurrent calls never collide.
 *
 * Format note: these two are deliberately different lengths so the login
 * form can tell them apart from a single text field —
 *   Admission No.  SCIS/2026/JSS3/001   (4 segments — school/year/class/seq)
 *   Staff ID       SCIS/2026/001        (3 segments — school/year/seq)
 * See auth.ts's identifyCredential() for where that split is read back.
 */

export async function nextAdmissionNo(classCode: string, year = "2026", db: Db = prisma) {
  const key = `STU:${year}:${classCode}`;
  const counter = await db.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return `SCIS/${year}/${classCode}/${String(counter.value).padStart(3, "0")}`;
}

// TEACHER accounts only — the admin account logs in with email (there's
// exactly one admin at launch, so a minted ID would add nothing), but every
// teacher added afterwards gets the next number in this single sequence.
export async function nextStaffId(year = "2026", db: Db = prisma) {
  const key = `STAFF:${year}`;
  const counter = await db.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return `SCIS/${year}/${String(counter.value).padStart(3, "0")}`;
}
