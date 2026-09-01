import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

const LEVEL_LABEL: Record<string, string> = {
  EARLY_YEARS: "Early Years",
  PRIMARY: "Primary",
  JSS: "Junior Secondary",
  SS: "Senior Secondary",
};

/**
 * Promotions — the end-of-session entry point for Case 1 (move most of a
 * class up together) and, via each class's detail screen, still available
 * for Case 2 (fix one student) even though the "Change class" button on a
 * student's own profile is the faster path for a single correction.
 *
 * One card per class with students in it right now. No "already promoted"
 * state to track here — each class simply always shows who is CURRENTLY
 * enrolled, so running this again later (a student added after the fact, or
 * a second pass mid-session) is always safe and never double-counts: a
 * student who was already moved out of this class in an earlier run of this
 * screen no longer appears in it.
 */
export default async function AdminPromotionsPage() {
  const [classes, currentSessionSetting] = await Promise.all([
    prisma.class.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
      include: {
        promotesTo: { select: { id: true, name: true } },
        _count: { select: { students: { where: { status: { in: ["ACTIVE", "AT_RISK"] } } } } },
      },
    }),
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
  ]);

  const currentSession = currentSessionSetting?.value ?? "";
  const classesWithStudents = classes.filter((c) => c._count.students > 0);

  let lastLevel: string | null = null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Promotions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentSession
            ? `Move students between classes for ${currentSession} — end-of-session promotion for a whole class, or a one-off correction for a single student.`
            : "Move students between classes — end-of-session promotion for a whole class, or a one-off correction for a single student."}
        </p>
      </div>

      {classesWithStudents.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No classes currently have enrolled students.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classesWithStudents.map((c) => {
          const showLevelHeader = c.level !== lastLevel;
          lastLevel = c.level;
          return (
            <div key={c.id} className="contents">
              {showLevelHeader && (
                <p className="col-span-full mt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase first:mt-0">
                  {LEVEL_LABEL[c.level] ?? c.level}
                </p>
              )}
              <Link
                href={`/portal/admin/promotions/${c.id}`}
                className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{c.name}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <HugeiconsIcon icon={UserGroupIcon} size={14} />
                    <span>
                      {c._count.students} student{c._count.students === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {c.promotesTo ? (
                      <>
                        Promotes to <span className="font-medium text-foreground">{c.promotesTo.name}</span> by
                        default
                      </>
                    ) : (
                      <Badge variant="outline" className="text-[11px]">
                        Terminal — no default set
                      </Badge>
                    )}
                  </p>
                </div>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={18}
                  className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          );
        })}
      </div>

      <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        Each default comes from a class&apos;s &quot;Promotes to&quot; setting on the{" "}
        <Link href="/portal/admin/classes" className="underline">
          Classes
        </Link>{" "}
        page — override it per student on the next screen for repeats, corrections, graduations or
        withdrawals. A student moved from here immediately drops off this list, so it&apos;s always
        safe to run again.
      </p>
    </div>
  );
}
