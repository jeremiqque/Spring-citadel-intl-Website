import { firstParam } from "@/lib/search-params";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon, Alert02Icon } from "@hugeicons/core-free-icons";

import { prisma } from "@/lib/prisma";
import { requireTeacher, formTeacherClass } from "@/lib/teacher";
import { parseTerm } from "@/lib/validation/id";
import { PageHeader } from "@/components/ui/page-header";
import { Surface, SurfaceHeader, EmptyState } from "@/components/ui/surface";
import { Segmented } from "@/components/ui/segmented";
import { Stat, StatGroup, ProgressMeter } from "@/components/ui/stat";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { PsychomotorRow } from "./psychomotor-row";
import { SubmitAllPsychomotorDrafts } from "./submit-all";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

/**
 * Form teacher psychomotor entry — the psychomotor twin of
 * teacher/grades/page.tsx, simplified because there's exactly one class to
 * pick from (a teacher is form teacher of at most one class, enforced by
 * Class.formTeacherId's DB-level uniqueness) rather than a set of
 * (class, subject) assignments, so the class/subject picker form that page
 * needs doesn't apply here — only the term selector does.
 *
 * Same authorisation shape as that page: the term in the URL is a request,
 * not permission, and nothing here is the security boundary — that's
 * requireFormTeacher() inside actions.ts, re-checked on every write.
 */
export default async function TeacherPsychomotorPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string | string[] }>;
}) {
  const raw = await searchParams;
  const term: TermValue | null = parseTerm(firstParam(raw.term));

  const { teacherId } = await requireTeacher();
  const [formClass, sessionSetting, termSetting] = await Promise.all([
    formTeacherClass(teacherId),
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
  ]);

  const currentSession = sessionSetting?.value ?? "";

  if (!formClass) {
    return (
      <div className="space-y-6">
        <PageHeader title="Psychomotor ratings" />
        <Surface padding="none">
          <EmptyState
            icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />}
            title="You aren't a form teacher yet"
          >
            Psychomotor ratings, attendance and class remarks are entered by each class's
            form teacher. An administrator assigns that role from the Classes page —
            ask them if you're expecting to see a class here.
          </EmptyState>
        </Surface>
      </div>
    );
  }

  const activeTerm: TermValue = term ?? parseTerm(termSetting?.value) ?? "TERM_1";
  const termLabel = activeTerm.replace("_", " ");

  const students = await prisma.student.findMany({
    where: { classId: formClass.id, status: { in: ["ACTIVE", "AT_RISK"] } },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const ratings = students.length
    ? await prisma.psychomotorRating.findMany({
        where: {
          studentId: { in: students.map((s) => s.id) },
          term: activeTerm,
          session: currentSession,
        },
      })
    : [];

  const ratingByStudent = new Map(ratings.map((r) => [r.studentId, r]));
  const draftCount = ratings.filter((r) => r.status === "DRAFT").length;
  const submittedCount = ratings.filter((r) => r.status === "SUBMITTED").length;
  const notEnteredCount = students.length - ratings.length;

  function hrefForTerm(nextTerm: TermValue) {
    const sp = new URLSearchParams();
    sp.set("term", nextTerm);
    return `?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${currentSession ? `${currentSession} · ` : ""}${termLabel}`}
        title="Psychomotor ratings"
        description={formClass.name}
        actions={
          <Segmented
            label="Term"
            items={(["TERM_1", "TERM_2", "TERM_3"] as const).map((t) => ({
              key: t,
              href: hrefForTerm(t),
              label: t.replace("_", " "),
              current: t === activeTerm,
            }))}
          />
        }
      />

      {currentSession === "" ? (
        <Surface role="alert" padding="sm" className="border-destructive/30 bg-destructive/5 shadow-none">
          <div className="flex gap-3">
            <HugeiconsIcon icon={Alert02Icon} size={18} className="mt-0.5 shrink-0 text-destructive" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-foreground">No academic session is set.</p>
              <p className="mt-1 leading-body text-muted-foreground">
                Rating entry is disabled until an administrator sets the current session.
              </p>
            </div>
          </div>
        </Surface>
      ) : (
        students.length > 0 && (
          <Surface padding="none" className="overflow-hidden">
            <div className="px-5 pt-4">
              <ProgressMeter
                label={`Rating progress for ${formClass.name}, ${termLabel}`}
                total={students.length}
                segments={[
                  { value: submittedCount, tone: "success", label: "submitted" },
                  { value: draftCount, tone: "warning", label: "draft" },
                  { value: notEnteredCount, tone: "neutral", label: "not entered" },
                ]}
              />
            </div>
            <StatGroup className="mt-4 rounded-none border-0 border-t border-border">
              <Stat label="Students" value={students.length} />
              <Stat label="Submitted" value={submittedCount} tone="success" />
              <Stat label="Drafts" value={draftCount} tone="warning" />
              <Stat
                label="Not entered"
                value={notEnteredCount}
                tone={notEnteredCount > 0 ? "neutral" : "success"}
              />
            </StatGroup>
          </Surface>
        )
      )}

      <Surface padding="none">
        <SurfaceHeader
          actions={
            currentSession !== "" && students.length > 0 ? (
              <SubmitAllPsychomotorDrafts
                classId={formClass.id}
                term={activeTerm}
                session={currentSession}
                draftCount={draftCount}
                className={formClass.name}
              />
            ) : undefined
          }
        >
          <div className="min-w-0">
            <h2 className="text-lg leading-heading font-semibold text-foreground">Student ratings</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Every trait is rated 1 (needs work) to 5 (excellent).</p>
          </div>
        </SurfaceHeader>

        {students.length === 0 ? (
          <EmptyState icon={<HugeiconsIcon icon={UserGroupIcon} size={18} />} title={`No students are enrolled in ${formClass.name} yet`}>
            There is nothing to rate until an administrator enrols students into this class.
          </EmptyState>
        ) : (
          <Table caption={`Psychomotor ratings for ${formClass.name}, ${termLabel}`}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Admission No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Punct.</TableHead>
                <TableHead>Neat.</TableHead>
                <TableHead>Honesty</TableHead>
                <TableHead>Leader.</TableHead>
                <TableHead>Coop.</TableHead>
                <TableHead>Handw.</TableHead>
                <TableHead>Sports</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const existing = ratingByStudent.get(s.id);
                return (
                  <PsychomotorRow
                    key={`${s.id}:${activeTerm}:${currentSession}`}
                    studentId={s.id}
                    studentName={s.user.name}
                    admissionNo={s.admissionNo}
                    classId={formClass.id}
                    term={activeTerm}
                    session={currentSession}
                    initial={
                      existing
                        ? {
                            punctuality: existing.punctuality,
                            neatness: existing.neatness,
                            honesty: existing.honesty,
                            leadership: existing.leadership,
                            cooperation: existing.cooperation,
                            handwriting: existing.handwriting,
                            sports: existing.sports,
                            remark: existing.remark,
                            status: existing.status,
                          }
                        : null
                    }
                  />
                );
              })}
            </TableBody>
          </Table>
        )}
      </Surface>
    </div>
  );
}
