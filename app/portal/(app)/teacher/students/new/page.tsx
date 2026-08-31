import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { requireTeacher, teacherClasses } from "@/lib/teacher";
import { StudentForm } from "../../../admin/students/student-form";
import { BackLink } from "@/components/ui/back-link";
import { EmptyState, Surface } from "@/components/ui/surface";

// The teacher-side twin of admin/students/new/page.tsx. Same StudentForm,
// same createStudentAction underneath — the only difference is the class
// picker only ever offers classes THIS teacher holds an assignment for.
// createStudentAction re-checks that server-side (requireStudentCreateAccess
// in admin/students/actions.ts); this list is what keeps a teacher from
// ever seeing another class in the dropdown to begin with, not what makes
// the restriction real.
export default async function TeacherNewStudentPage() {
  const { teacherId } = await requireTeacher();
  const classes = await teacherClasses(teacherId);

  return (
    <div className="space-y-6">
      <BackLink href="/portal/teacher/classes" label="Back to my classes" />
      <h1 className="text-2xl font-semibold text-foreground">Enroll a student</h1>

      {classes.length === 0 ? (
        <Surface padding="none">
          <EmptyState
            icon={<HugeiconsIcon icon={Alert02Icon} size={18} />}
            title="No classes assigned yet"
          >
            You aren&apos;t assigned to a class yet, so there&apos;s nowhere to enroll a
            student into. Ask the school office to assign you to a class first.
          </EmptyState>
        </Surface>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="rounded-lg border border-border p-6">
            <StudentForm mode="create" classes={classes} doneHref="/portal/teacher/classes" />
          </div>

          <aside className="h-fit space-y-4 rounded-lg border border-border bg-muted/30 p-5">
            <h2 className="text-sm font-medium text-foreground">What happens next</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2.5">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={16}
                  className="mt-0.5 shrink-0 text-green-700"
                />
                <span>You can only enroll into classes you're assigned to teach.</span>
              </li>
              <li className="flex gap-2.5">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={16}
                  className="mt-0.5 shrink-0 text-green-700"
                />
                <span>
                  A login and a one-time temporary password are created — shown once, right
                  after you submit. Write them down or copy them then; they can&apos;t be
                  shown again.
                </span>
              </li>
              <li className="flex gap-2.5">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={16}
                  className="mt-0.5 shrink-0 text-green-700"
                />
                <span>The student is required to set their own password on first login.</span>
              </li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
