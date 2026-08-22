import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentForm } from "../../student-form";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [student, classes] = await Promise.all([
    prisma.student.findUnique({ where: { id }, include: { user: true } }),
    prisma.class.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true },
    }),
  ]);

  if (!student) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Edit {student.user.name}</h1>
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
  );
}
