import { prisma } from "@/lib/prisma";
import { TeacherForm } from "../teacher-form";
import { BackLink } from "@/components/ui/back-link";

export default async function NewTeacherPage() {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <BackLink href="/portal/admin/teachers" label="Back to teachers" />
      <h1 className="text-2xl font-semibold text-foreground">Add a teacher</h1>
      <TeacherForm subjects={subjects} />
    </div>
  );
}
