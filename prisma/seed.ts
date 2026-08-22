/**
 * Spring Citadel portal — database seed.
 *
 *   npx prisma db seed
 *
 * Idempotent: every write is an upsert keyed on a natural unique field, so
 * running it twice does not duplicate anything. Safe to re-run after editing
 * the CLASSES or SUBJECTS lists below.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EDIT ME: the CLASSES array is a placeholder built from the four levels on
 * the school's academics page, assuming ONE stream per year. If the school
 * runs streams (JSS 3A / JSS 3B), add them here BEFORE anyone is enrolled —
 * `code` feeds the admission number, and those numbers go on paper records
 * the school keeps for years.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient, Level, Role, Gender, Term, SubjectStream } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_GRADING_CONFIG, GRADING_KEYS } from "../lib/grading";

const prisma = new PrismaClient();

// ─── School structure ───────────────────────────────────────────────────────

const CLASSES: { name: string; code: string; level: Level }[] = [
  { name: "Pre-Nursery", code: "PRE", level: Level.EARLY_YEARS },
  { name: "Nursery 1", code: "NUR1", level: Level.EARLY_YEARS },
  { name: "Nursery 2", code: "NUR2", level: Level.EARLY_YEARS },
  { name: "Nursery 3", code: "NUR3", level: Level.EARLY_YEARS },

  { name: "Primary 1", code: "PRY1", level: Level.PRIMARY },
  { name: "Primary 2", code: "PRY2", level: Level.PRIMARY },
  { name: "Primary 3", code: "PRY3", level: Level.PRIMARY },
  { name: "Primary 4", code: "PRY4", level: Level.PRIMARY },
  { name: "Primary 5", code: "PRY5", level: Level.PRIMARY },
  { name: "Primary 6", code: "PRY6", level: Level.PRIMARY },

  { name: "JSS 1", code: "JSS1", level: Level.JSS },
  { name: "JSS 2", code: "JSS2", level: Level.JSS },
  { name: "JSS 3", code: "JSS3", level: Level.JSS },

  { name: "SS 1", code: "SS1", level: Level.SS },
  { name: "SS 2", code: "SS2", level: Level.SS },
  { name: "SS 3", code: "SS3", level: Level.SS },
];

// gradingEnabled is derived, not hand-set: JSS and SS use the 20/30/50
// assessment split, Early Years and Primary do not have an agreed scheme yet.
const GRADED_LEVELS: Level[] = [Level.JSS, Level.SS];

// Subject lists. `levels` is an array because a subject can run across more
// than one level — one Mathematics row, not four. `streams` is an array for
// the same reason: Geography is offered under both the Science and Arts
// fields, and the Nigerian languages are a core pick that also counts toward
// Arts. `streams` is empty for everything below SS, which has no field
// structure. `compulsory` is meaningful only for SS.
const SUBJECTS: {
  name: string;
  code: string;
  levels: Level[];
  streams?: SubjectStream[];
  compulsory?: boolean;
  note?: string;
}[] = [
  // ─── Early Years (Pre-Nursery, Nursery 1-3) — Montessori-style curriculum,
  // provided by the school 9 Aug 2026. ─────────────────────────────────────
  { name: "Number", code: "EY-NUM", levels: [Level.EARLY_YEARS] },
  { name: "Letters", code: "EY-LET", levels: [Level.EARLY_YEARS] },
  { name: "Sensorial Education", code: "EY-SEN", levels: [Level.EARLY_YEARS] },
  { name: "Cultural Life", code: "EY-CUL", levels: [Level.EARLY_YEARS] },
  { name: "Practice Life", code: "EY-PRA", levels: [Level.EARLY_YEARS] },
  { name: "Colouring and Painting", code: "EY-ART", levels: [Level.EARLY_YEARS] },
  { name: "Rhymes", code: "EY-RHY", levels: [Level.EARLY_YEARS] },

  // ─── Primary (1-6) — provided by the school 9 Aug 2026. ─────────────────
  { name: "English", code: "PRY-ENG", levels: [Level.PRIMARY] },
  { name: "Mathematics", code: "PRY-MTH", levels: [Level.PRIMARY] },
  { name: "Pre-Vocational Studies", code: "PRY-PVS", levels: [Level.PRIMARY] },
  { name: "National Values", code: "PRY-NAV", levels: [Level.PRIMARY] },
  { name: "Basic Science and Technology", code: "PRY-BST", levels: [Level.PRIMARY] },
  { name: "History", code: "PRY-HIS", levels: [Level.PRIMARY] },
  { name: "Hand Writing", code: "PRY-HWR", levels: [Level.PRIMARY] },
  { name: "Verbal", code: "PRY-VER", levels: [Level.PRIMARY] },
  { name: "Quantitative", code: "PRY-QNT", levels: [Level.PRIMARY] },
  { name: "Religion", code: "PRY-REL", levels: [Level.PRIMARY] },
  { name: "Character and Morality", code: "PRY-CHM", levels: [Level.PRIMARY] },
  // Hausa is Primary 3-6 only, not 1-6. The schema's Subject.levels is
  // level-wide (EARLY_YEARS | PRIMARY | JSS | SS) and has no notion of a
  // sub-range within a level, so this is recorded here as a note rather than
  // enforced anywhere in code. It costs nothing today because gradingEnabled
  // is false for PRIMARY, so no grade-entry screen reads this list yet. If
  // Primary grading is switched on later, this becomes a real gap: either
  // teach Hausa as a Primary-wide subject in practice, or add a
  // classId-scoped join (Class <-> Subject) instead of the current
  // level-scoped one. Flag this to the school before enabling Primary grading.
  { name: "Hausa", code: "PRY-HAU", levels: [Level.PRIMARY], note: "Offered Primary 3-6 only; not enforced in schema" },

  // ─── SS (1-3) — provided by the school 14 Aug 2026. ──────────────────────
  // Structure: five compulsory core subjects, then electives from one field
  // (at least 2 from the field + 1 other). Nine rows below are shared with
  // JSS (levels: [JSS, SS]) — their `streams` describe the SS role only; JSS
  // has no field structure. Everything JSS-only carries no streams at all.
  //
  // Two known gaps, both selection *rules* rather than data, so neither is
  // enforced in the schema. Flag both before subject selection is built:
  //   1. "one Nigerian language" — HAU/IGB/YOR are each marked compulsory,
  //      but a student takes exactly one. Nothing stops all three today.
  //   2. "at least 2 from the field + 1 other" — no minimum/maximum count is
  //      modelled anywhere.
  //
  // ── Compulsory core (all SS students) ───────────────────────────────────
  { name: "English Language", code: "ENG", levels: [Level.JSS, Level.SS], streams: [SubjectStream.CORE], compulsory: true },
  { name: "Mathematics", code: "MTH", levels: [Level.JSS, Level.SS], streams: [SubjectStream.CORE], compulsory: true },
  { name: "Citizenship Education", code: "CIT", levels: [Level.SS], streams: [SubjectStream.CORE], compulsory: true },
  // Listed by the school as "Computer Studies / ICT". Kept as the existing
  // CMP row so JSS Computer Studies and SS ICT stay one subject. Computer
  // Science (CSC, Science field) and Data Processing (DPR, Commercial field)
  // are separate rows because the school lists them as separate electives —
  // confirm with the school that these really are three distinct subjects on
  // the timetable and not one subject named three ways.
  { name: "Computer Studies / ICT", code: "CMP", levels: [Level.JSS, Level.SS], streams: [SubjectStream.CORE], compulsory: true },
  // One Nigerian language is compulsory; these three also serve as Arts
  // electives, hence both streams. See gap (1) above.
  { name: "Hausa", code: "HAU", levels: [Level.SS], streams: [SubjectStream.CORE, SubjectStream.ARTS], compulsory: true, note: "Core requirement is one of HAU/IGB/YOR, not all three" },
  { name: "Igbo", code: "IGB", levels: [Level.SS], streams: [SubjectStream.CORE, SubjectStream.ARTS], compulsory: true, note: "Core requirement is one of HAU/IGB/YOR, not all three" },
  { name: "Yoruba", code: "YOR", levels: [Level.SS], streams: [SubjectStream.CORE, SubjectStream.ARTS], compulsory: true, note: "Core requirement is one of HAU/IGB/YOR, not all three" },

  // ── Science field ───────────────────────────────────────────────────────
  { name: "Biology", code: "BIO", levels: [Level.SS], streams: [SubjectStream.SCIENCE] },
  { name: "Chemistry", code: "CHM", levels: [Level.SS], streams: [SubjectStream.SCIENCE] },
  { name: "Physics", code: "PHY", levels: [Level.SS], streams: [SubjectStream.SCIENCE] },
  { name: "Further Mathematics", code: "FMT", levels: [Level.SS], streams: [SubjectStream.SCIENCE] },
  { name: "Agricultural Science", code: "AGR", levels: [Level.JSS, Level.SS], streams: [SubjectStream.SCIENCE] },
  { name: "Health Education", code: "HED", levels: [Level.SS], streams: [SubjectStream.SCIENCE] },
  { name: "Physical Education", code: "PHE", levels: [Level.JSS, Level.SS], streams: [SubjectStream.SCIENCE] },
  { name: "Computer Science", code: "CSC", levels: [Level.SS], streams: [SubjectStream.SCIENCE] },
  // Geography sits in two fields — the reason `streams` is an array.
  { name: "Geography", code: "GEO", levels: [Level.SS], streams: [SubjectStream.SCIENCE, SubjectStream.ARTS] },

  // ── Arts / Humanities field ─────────────────────────────────────────────
  { name: "Literature in English", code: "LIT", levels: [Level.SS], streams: [SubjectStream.ARTS] },
  { name: "Government", code: "GOV", levels: [Level.SS], streams: [SubjectStream.ARTS] },
  { name: "History", code: "HIS", levels: [Level.SS], streams: [SubjectStream.ARTS] },
  { name: "Christian Religious Studies", code: "CRS", levels: [Level.JSS, Level.SS], streams: [SubjectStream.ARTS] },
  { name: "Islamic Religious Studies", code: "IRS", levels: [Level.JSS, Level.SS], streams: [SubjectStream.ARTS] },
  { name: "French Language", code: "FRE", levels: [Level.JSS, Level.SS], streams: [SubjectStream.ARTS] },
  { name: "Fine Arts", code: "ART", levels: [Level.JSS, Level.SS], streams: [SubjectStream.ARTS] },
  { name: "Music", code: "MUS", levels: [Level.SS], streams: [SubjectStream.ARTS] },
  { name: "Theatre Arts / Drama", code: "DRA", levels: [Level.SS], streams: [SubjectStream.ARTS] },
  // Nigerian Languages also appear here — see HAU / IGB / YOR in the core
  // block above, which carry ARTS as a second stream.

  // ── Commercial / Business field ─────────────────────────────────────────
  { name: "Economics", code: "ECO", levels: [Level.SS], streams: [SubjectStream.COMMERCIAL] },
  { name: "Commerce", code: "COM", levels: [Level.SS], streams: [SubjectStream.COMMERCIAL] },
  { name: "Accounting", code: "ACC", levels: [Level.SS], streams: [SubjectStream.COMMERCIAL] },
  { name: "Business Studies", code: "BUS", levels: [Level.SS], streams: [SubjectStream.COMMERCIAL] },
  { name: "Office Practice", code: "OFP", levels: [Level.SS], streams: [SubjectStream.COMMERCIAL] },
  { name: "Insurance", code: "INS", levels: [Level.SS], streams: [SubjectStream.COMMERCIAL] },
  { name: "Marketing", code: "MKT", levels: [Level.SS], streams: [SubjectStream.COMMERCIAL] },
  { name: "Salesmanship", code: "SAL", levels: [Level.SS], streams: [SubjectStream.COMMERCIAL] },
  { name: "Store Management", code: "STM", levels: [Level.SS], streams: [SubjectStream.COMMERCIAL] },
  { name: "Data Processing", code: "DPR", levels: [Level.SS], streams: [SubjectStream.COMMERCIAL], note: "Listed by the school as 'Computer Studies / Data Processing' — see CMP" },

  // ─── JSS (1-3) — still the PRD's generic Nigerian junior secondary list.
  // NOT yet confirmed against Spring Citadel's actual JSS curriculum. Early
  // Years, Primary and SS have been confirmed by the school; JSS has not. ──
  { name: "Basic Science", code: "BSC", levels: [Level.JSS] },
  { name: "Basic Technology", code: "BTC", levels: [Level.JSS] },
  { name: "Social Studies", code: "SOS", levels: [Level.JSS] },
  { name: "Civic Education", code: "CIV", levels: [Level.JSS] },
  { name: "Home Economics", code: "HEC", levels: [Level.JSS] },
  { name: "Vernacular", code: "VER", levels: [Level.JSS] },
];

// Nigerian academic year runs September to July, so the session about to start
// is 2026/2027, Term 1. Both live in the Setting table so the school can roll
// the term over from the admin UI without a redeploy.
const CURRENT_SESSION = "2026/2027";
const CURRENT_TERM = Term.TERM_1;

// ─── Demo accounts ──────────────────────────────────────────────────────────
// Fabricated names only. Real students are imported after the role-leakage
// audit in Package 8, never before.

const DEMO_PASSWORD = "ChangeMe123!";

const DEMO_TEACHERS = [
  { name: "Ngozi Okafor", email: "n.okafor@example.test", subject: "MTH", gender: Gender.FEMALE, phone: "08050000001" },
  { name: "Ibrahim Bello", email: "i.bello@example.test", subject: "ENG", gender: Gender.MALE, phone: "08050000002" },
];

const DEMO_STUDENTS = [
  { name: "Amina Yusuf", classCode: "JSS3", gender: Gender.FEMALE, dob: "2012-03-14", guardian: "Hauwa Yusuf" },
  { name: "Chidi Nwosu", classCode: "JSS3", gender: Gender.MALE, dob: "2012-07-02", guardian: "Emeka Nwosu" },
  { name: "Fatima Sani", classCode: "JSS2", gender: Gender.FEMALE, dob: "2013-01-25", guardian: "Sani Abubakar" },
  { name: "Tunde Adeyemi", classCode: "SS1", gender: Gender.MALE, dob: "2010-11-09", guardian: "Bola Adeyemi" },
  { name: "Grace Iheanacho", classCode: "SS2", gender: Gender.FEMALE, dob: "2009-05-30", guardian: "Chinwe Iheanacho" },
  { name: "Musa Danladi", classCode: "SS3", gender: Gender.MALE, dob: "2008-09-18", guardian: "Aisha Danladi" },
];

// ─── Seed ───────────────────────────────────────────────────────────────────

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const [key, value] of [
    ["currentSession", CURRENT_SESSION],
    ["currentTerm", CURRENT_TERM],
  ] as const) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log("settings   " + CURRENT_SESSION + " " + CURRENT_TERM);

  // Grading policy rows. `update: {}` on purpose — unlike currentSession and
  // currentTerm above, these are seeded ONCE and never overwritten by a
  // re-run. Re-seeding is a routine thing to do against a dev branch, and
  // silently resetting the school's agreed grade bands back to the developer
  // defaults would be an invisible, results-changing regression. The defaults
  // live in lib/grading.ts; this only materialises them as rows so they are
  // visible and editable in the admin UI rather than implied by their absence.
  for (const [key, value] of [
    [GRADING_KEYS.bands, JSON.stringify(DEFAULT_GRADING_CONFIG.bands)],
    [GRADING_KEYS.atRiskThreshold, String(DEFAULT_GRADING_CONFIG.atRiskThreshold)],
    [GRADING_KEYS.atRiskMinSubjects, String(DEFAULT_GRADING_CONFIG.atRiskMinSubjects)],
  ] as const) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log("grading    bands + at-risk rule (defaults, only if unset)");

  for (const c of CLASSES) {
    const gradingEnabled = GRADED_LEVELS.includes(c.level);
    await prisma.class.upsert({
      where: { code: c.code },
      update: { name: c.name, level: c.level, gradingEnabled },
      create: { ...c, gradingEnabled },
    });
  }
  const graded = CLASSES.filter((c) => GRADED_LEVELS.includes(c.level)).length;
  console.log("classes    " + CLASSES.length + " (" + graded + " with grading enabled)");

  for (const s of SUBJECTS) {
    // `note` is documentation-only (see the Hausa entries above) and is not a
    // column on Subject — pass only real schema fields to Prisma.
    const fields = {
      name: s.name,
      levels: s.levels,
      streams: s.streams ?? [],
      compulsory: s.compulsory ?? false,
    };
    await prisma.subject.upsert({
      where: { code: s.code },
      update: fields,
      create: { code: s.code, ...fields },
    });
  }
  console.log("subjects   " + SUBJECTS.length);

  // This seed only ever upserts, so a subject dropped from the list above
  // (Technical Drawing went when the school confirmed the SS list on
  // 14 Aug 2026) survives in any database that was seeded earlier. Deleting
  // it here is not safe — Grade rows may point at it — so report it and let
  // a human decide.
  const known = new Set(SUBJECTS.map((s) => s.code));
  const orphans = (await prisma.subject.findMany({ select: { code: true, name: true } }))
    .filter((s) => !known.has(s.code));
  if (orphans.length > 0) {
    console.log(
      "WARNING    " + orphans.length + " subject(s) in the database are no longer in the seed list: " +
      orphans.map((o) => o.code + " (" + o.name + ")").join(", ") +
      ". Check for existing grades before removing them."
    );
  }

  // Admin — mustChangePassword false so you can log in and look around.
  // Every other seeded account is forced to change on first login.
  await prisma.user.upsert({
    where: { email: "admin@springcitadel.test" },
    update: {},
    create: {
      name: "School Administrator",
      email: "admin@springcitadel.test",
      password: hash,
      role: Role.ADMIN,
      mustChangePassword: false,
    },
  });
  console.log("admin      admin@springcitadel.test");

  // Staff IDs go through the same Counter-table pattern as admission
  // numbers (lib/ids.ts's nextStaffId) — one shared sequence, "SCIS/2026/001",
  // no role segment. The admin account itself logs in with email, not a
  // Staff ID (see auth.ts): there's exactly one admin at launch.
  //
  // Guarded the same way the student loop below already was: mint a new
  // staffId (and burn a counter value) ONLY the first time a teacher is
  // created. Without the `existing` check, re-running this idempotent seed
  // would still upsert(update: {}) the Teacher row (a no-op) but would keep
  // incrementing STAFF:2026 forever on every run — a real bug introduced
  // when this moved off a local counter variable onto the shared Counter
  // table, caught while pulling demo credentials for a login test.
  const teacherCredentials: { name: string; staffId: string }[] = [];

  for (const t of DEMO_TEACHERS) {
    const subject = await prisma.subject.findUnique({ where: { code: t.subject } });
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: { name: t.name, email: t.email, password: hash, role: Role.TEACHER },
    });

    const existingTeacher = await prisma.teacher.findUnique({ where: { userId: user.id } });

    let teacher;
    if (existingTeacher) {
      teacher = existingTeacher;
    } else {
      const staffCounter = await prisma.counter.upsert({
        where: { key: "STAFF:2026" },
        update: { value: { increment: 1 } },
        create: { key: "STAFF:2026", value: 1 },
      });
      const staffId = "SCIS/2026/" + String(staffCounter.value).padStart(3, "0");
      teacher = await prisma.teacher.create({
        data: {
          staffId,
          userId: user.id,
          phone: t.phone,
          gender: t.gender,
          primarySubjectId: subject ? subject.id : null,
        },
      });
    }
    teacherCredentials.push({ name: t.name, staffId: teacher.staffId });

    const gradedClasses = await prisma.class.findMany({ where: { gradingEnabled: true } });
    for (const cls of gradedClasses) {
      if (!subject) continue;
      if (!subject.levels.includes(cls.level)) continue;
      await prisma.teacherAssignment.upsert({
        where: {
          teacherId_classId_subjectId: {
            teacherId: teacher.id,
            classId: cls.id,
            subjectId: subject.id,
          },
        },
        update: {},
        create: { teacherId: teacher.id, classId: cls.id, subjectId: subject.id },
      });
    }
  }
  console.log("teachers   " + DEMO_TEACHERS.length + " (assigned to all graded classes)");

  // Admission numbers go through the Counter table — the same path lib/ids.ts
  // will use, so the sequence stays consistent.
  const studentCredentials: { name: string; admissionNo: string }[] = [];

  for (const s of DEMO_STUDENTS) {
    const cls = await prisma.class.findUnique({ where: { code: s.classCode } });
    if (!cls) throw new Error("Unknown class code in DEMO_STUDENTS: " + s.classCode);

    const email = s.name.toLowerCase().replace(/\s+/g, ".") + "@student.test";
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name: s.name, email, password: hash, role: Role.STUDENT },
    });

    const existing = await prisma.student.findUnique({ where: { userId: user.id } });
    if (existing) {
      studentCredentials.push({ name: s.name, admissionNo: existing.admissionNo });
      continue;
    }

    const counterKey = "STU:2026:" + cls.code;
    const counter = await prisma.counter.upsert({
      where: { key: counterKey },
      update: { value: { increment: 1 } },
      create: { key: counterKey, value: 1 },
    });
    const admissionNo =
      "SCIS/2026/" + cls.code + "/" + String(counter.value).padStart(3, "0");

    await prisma.student.create({
      data: {
        admissionNo,
        userId: user.id,
        classId: cls.id,
        dob: new Date(s.dob),
        gender: s.gender,
        guardianName: s.guardian,
        guardianPhone: "08060000000",
        address: "Tunga, Minna, Niger State",
      },
    });
    studentCredentials.push({ name: s.name, admissionNo });
  }
  console.log("students   " + DEMO_STUDENTS.length);

  // Print every demo login right here — this is the one place that always
  // reflects what's actually in the database (unlike a hardcoded list in
  // chat, which goes stale the moment the ID scheme or seed data changes).
  console.log("\n--- Demo logins (password: " + DEMO_PASSWORD + " for all) ---");
  console.log("Admin    admin@springcitadel.test   (no password change required)");
  for (const t of teacherCredentials) {
    console.log("Teacher  " + t.staffId + "   (" + t.name + ")");
  }
  for (const s of studentCredentials) {
    console.log("Student  " + s.admissionNo + "   (" + s.name + ")");
  }
  console.log("\nEveryone except admin must change their password on first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
