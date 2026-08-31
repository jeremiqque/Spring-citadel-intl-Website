import type { Subject } from "@prisma/client";
import {
  Baby02Icon,
  Backpack01Icon,
  Book02Icon,
  GraduationCapIcon,
  TestTube02Icon,
  PaletteIcon,
  Briefcase01Icon,
} from "@hugeicons/core-free-icons";
import type { Level, SubjectStream } from "@/lib/validation/subject";

/**
 * The Subjects directory, one card per curriculum category — Nursery,
 * Primary, JSS, and Senior Secondary split by field. Used to be one long
 * page (then one page with these as scrolling sections); this is the same
 * grouping again, but as a landing page of cards you click into, the way
 * /admin/settings is a directory of cards rather than three forms stacked on
 * one screen. See that page's own comment for the same reasoning.
 *
 * `level`/`stream` here are what a section's subject list is filtered by
 * (see sectionSubjects below) AND what "Add subject" pre-checks when opened
 * from inside that section — a subject added from the Junior Secondary page
 * starts with JSS already ticked rather than requiring it be picked twice.
 */
export type SectionDef = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: typeof Baby02Icon;
  level: Level;
  stream: SubjectStream | null;
};

export const SECTIONS: SectionDef[] = [
  {
    slug: "early-years",
    title: "Nursery (Early Years)",
    shortTitle: "Nursery",
    description: "Pre-Nursery and Nursery 1–3.",
    icon: Baby02Icon,
    level: "EARLY_YEARS",
    stream: null,
  },
  {
    slug: "primary",
    title: "Primary",
    shortTitle: "Primary",
    description: "Primary 1–6.",
    icon: Backpack01Icon,
    level: "PRIMARY",
    stream: null,
  },
  {
    slug: "jss",
    title: "Junior Secondary (JSS)",
    shortTitle: "JSS",
    description: "JSS 1–3.",
    icon: Book02Icon,
    level: "JSS",
    stream: null,
  },
  {
    slug: "ss-core",
    title: "Senior Secondary · Core",
    shortTitle: "SS Core",
    description: "Compulsory subjects every SS 1–3 student takes.",
    icon: GraduationCapIcon,
    level: "SS",
    stream: "CORE",
  },
  {
    slug: "ss-science",
    title: "Senior Secondary · Science",
    shortTitle: "SS Science",
    description: "SS 1–3 science electives.",
    icon: TestTube02Icon,
    level: "SS",
    stream: "SCIENCE",
  },
  {
    slug: "ss-arts",
    title: "Senior Secondary · Arts",
    shortTitle: "SS Arts",
    description: "SS 1–3 arts electives.",
    icon: PaletteIcon,
    level: "SS",
    stream: "ARTS",
  },
  {
    slug: "ss-commercial",
    title: "Senior Secondary · Commercial",
    shortTitle: "SS Commercial",
    description: "SS 1–3 commercial electives.",
    icon: Briefcase01Icon,
    level: "SS",
    stream: "COMMERCIAL",
  },
];

/**
 * A synthetic eighth section, appended (see sectionsWithData) only when it
 * has something in it. Shouldn't normally happen given the seeded
 * curriculum — every SS subject carries at least one field — but a
 * field-less SS subject is valid at the schema level, and one landing here
 * silently unfindable, with no page it belongs to, would be worse than an
 * extra card that only appears when it's needed.
 */
export const SS_GENERAL_SECTION: SectionDef = {
  slug: "ss-general",
  title: "Senior Secondary · General",
  shortTitle: "SS General",
  description: "SS subjects with no science/arts/commercial field set.",
  icon: GraduationCapIcon,
  level: "SS",
  stream: null,
};

export function findSection(slug: string): SectionDef | undefined {
  if (slug === SS_GENERAL_SECTION.slug) return SS_GENERAL_SECTION;
  return SECTIONS.find((s) => s.slug === slug);
}

/** Every subject that belongs on a given section's page. */
export function subjectsForSection<T extends Pick<Subject, "levels" | "streams">>(
  subjects: T[],
  section: SectionDef
): T[] {
  if (section.slug === SS_GENERAL_SECTION.slug) {
    return subjects.filter((s) => s.levels.includes("SS") && s.streams.length === 0);
  }
  return subjects.filter(
    (s) => s.levels.includes(section.level) && (section.stream === null || s.streams.includes(section.stream))
  );
}

/** The cards to show on the directory — the 7 fixed sections, plus the
 * synthetic "General" one only when there's actually a subject for it to
 * hold. */
export function sectionsWithData<T extends Pick<Subject, "levels" | "streams">>(subjects: T[]): SectionDef[] {
  const hasGeneral = subjectsForSection(subjects, SS_GENERAL_SECTION).length > 0;
  return hasGeneral ? [...SECTIONS, SS_GENERAL_SECTION] : SECTIONS;
}
