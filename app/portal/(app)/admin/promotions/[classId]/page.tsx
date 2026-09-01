import { notFound } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { prisma } from "@/lib/prisma";
import { PromotionReview } from "./promotion-review";

/**
 * The bulk-review screen for one class — every currently-enrolled student,
 * pre-filled with the class's default "promotes to" target, each row
 * overridable before anything is saved. See ../actions.ts's
 * promoteClassAction for what actually happens on confirm.
 */
export default async function ClassPromotionsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  const [cls, students, allClasses, currentSessionSetting] = await Promise.all([
    prisma.class.findUnique({
      where: { id: classId },
      include: { promotesTo: { select: { id: true, name: true } } },
    }),
    prisma.student.findMany({
      where: { classId, status: { in: ["ACTIVE", "AT_RISK"] } },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.class.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
  ]);

  if (!cls) notFound();

  const currentSession = currentSessionSetting?.value ?? "";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal/admin/promotions"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Promotions
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{cls.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {students.length} student{students.length === 1 ? "" : "s"}
              {currentSession ? ` · ${currentSession}` : ""}
              {cls.promotesTo ? ` · defaults to ${cls.promotesTo.name}` : " · terminal — no default target"}
            </p>
          </div>
        </div>
      </div>

      {!currentSession && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No academic session is set. Set the current session in Settings before promoting students —
          each change is recorded against that session.
        </div>
      )}

      <PromotionReview
        classId={cls.id}
        className={cls.name}
        defaultToClassId={cls.promotesToClassId}
        students={students.map((s) => ({ id: s.id, name: s.user.name }))}
        classes={allClasses}
        disabled={!currentSession}
      />
    </div>
  );
}
