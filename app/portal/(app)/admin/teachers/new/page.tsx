import { prisma } from "@/lib/prisma";
import { TeacherForm } from "../teacher-form";

export default async function NewTeacherPage() {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Add a teacher</h1>
      <TeacherForm subjects={subjects} />
    </div>
  );
}
