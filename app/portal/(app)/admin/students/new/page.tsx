import { prisma } from "@/lib/prisma";
import { StudentForm } from "../student-form";

export default async function NewStudentPage() {
  const classes = await prisma.class.findMany({
    orderBy: [{ level: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Enroll a student</h1>
      <StudentForm mode="create" classes={classes} />
    </div>
  );
}
