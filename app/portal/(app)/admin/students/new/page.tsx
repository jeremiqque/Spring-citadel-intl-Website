import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { prisma } from "@/lib/prisma";
import { StudentForm } from "../student-form";
import { BackLink } from "@/components/ui/back-link";

export default async function NewStudentPage() {
  const classes = await prisma.class.findMany({
    orderBy: [{ level: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true },
  });

  return (
    <div className="space-y-6">
      <BackLink href="/portal/admin/students" label="Back to students" />
      <h1 className="text-2xl font-semibold text-foreground">Enroll a student</h1>

      {/* Was the form alone in a single narrow column with the rest of the
          page empty — a two-column layout instead, form on the left in its
          own card, and a short "what happens next" panel on the right so an
          admin knows before submitting (not after) that this generates a
          login and a temporary password, not just a database row. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-lg border border-border p-6">
          <StudentForm mode="create" classes={classes} />
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
              <span>An admission number is generated automatically from the class you pick.</span>
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
    </div>
  );
}
