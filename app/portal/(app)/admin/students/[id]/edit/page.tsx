import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER } from "@/lib/user-select";
import { StudentForm } from "../../student-form";
import { BackLink } from "@/components/ui/back-link";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [student, classes] = await Promise.all([
    prisma.student.findUnique({ where: { id }, include: { user: PUBLIC_USER } }),
    prisma.class.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true },
    }),
  ]);

  if (!student) notFound();

  return (
    <div className="space-y-6">
      <BackLink href={`/portal/admin/students/${student.id}`} label="Back to profile" />
      <h1 className="text-2xl font-semibold text-foreground">Edit {student.user.name}</h1>
      <div className="max-w-2xl rounded-lg border border-border p-6">
        <StudentForm
          mode="edit"
          studentId={student.id}
          classes={classes}
          defaultValues={{
            name: student.user.name,
            dob: student.dob.toISOString().slice(0, 10),
            gender: student.gender,
            classId: student.classId,
            guardianName: student.guardianName,
            guardianPhone: student.guardianPhone,
            address: student.address,
          }}
        />
      </div>
    </div>
  );
}
