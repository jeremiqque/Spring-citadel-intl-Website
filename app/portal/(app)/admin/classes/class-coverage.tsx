"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { addAssignmentAction, removeAssignmentAction } from "../teachers/actions";

export type ClassAssignment = {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
};
type SubjectOption = { id: string; name: string };
type TeacherOption = { id: string; name: string };

// Same idea as SubjectCoverage, from the other side: a class's "Teachers"
// count used to be a dead-end number. This opens who actually covers the
// class subject-by-subject, and lets an admin fill a gap without leaving
// the page — same addAssignmentAction/removeAssignmentAction the teacher
// profile and the Subjects page both call, so all three stay in sync.
export function ClassCoverage({
  classId,
  className,
  assignments,
  subjects,
  teachers,
}: {
  classId: string;
  className: string;
  assignments: ClassAssignment[];
  subjects: SubjectOption[];
  teachers: TeacherOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ClassAssignment | null>(null);

  const teacherCount = new Set(assignments.map((a) => a.teacherId)).size;

  const handleAdd = () => {
    if (!teacherId || !subjectId) {
      setError("Select both a teacher and a subject.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addAssignmentAction(teacherId, classId, subjectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTeacherId("");
      setSubjectId("");
      router.refresh();
    });
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    startTransition(async () => {
      const result = await removeAssignmentAction(removeTarget.id, removeTarget.teacherId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRemoveTarget(null);
      router.refresh();
    });
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={`${className} — ${teacherCount === 0 ? "no teachers assigned" : `${teacherCount} teacher${teacherCount === 1 ? "" : "s"} assigned`}`}
            className="rounded text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            {teacherCount}
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-md text-left">
          <DialogHeader>
            <DialogTitle>{className}</DialogTitle>
            <DialogDescription>
              {assignments.length === 0
                ? "No teacher covers any subject in this class yet."
                : `${teacherCount} teacher${teacherCount === 1 ? "" : "s"}, covering ${assignments.length} subject${assignments.length === 1 ? "" : "s"}.`}
            </DialogDescription>
          </DialogHeader>

          {assignments.length > 0 && (
            <div className="max-h-[40vh] space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <span>
                    {a.subjectName}
                    <span className="text-muted-foreground"> — </span>
                    <Link href={`/portal/admin/teachers/${a.teacherId}`} className="text-brand hover:underline">
                      {a.teacherName}
                    </Link>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setRemoveTarget(a);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">Assign a teacher</p>
            {subjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">No subjects run at this class's level.</p>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-36">
                  <Select value={teacherId} onValueChange={setTeacherId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36">
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAdd} disabled={isPending}>
                  {isPending ? "Assigning…" : "Assign"}
                </Button>
              </div>
            )}
          </div>

          {error && !removeTarget && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove {removeTarget?.teacherName} from {className} — {removeTarget?.subjectName}?
            </DialogTitle>
            <DialogDescription>
              The teacher will no longer be able to enter grades for this class and subject.
              Grades already submitted are not affected.
            </DialogDescription>
          </DialogHeader>
          {error && removeTarget && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isPending}>
              {isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
