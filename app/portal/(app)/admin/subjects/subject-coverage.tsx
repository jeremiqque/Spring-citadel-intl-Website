"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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

export type SubjectAssignment = {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
};
type ClassOption = { id: string; name: string };
type TeacherOption = { id: string; name: string };

// Turns the old static "Teachers assigned" count into the actionable thing
// the page's own footer note used to send admins away to do — "open that
// teacher's profile and add a class assignment." Same addAssignmentAction /
// removeAssignmentAction the teacher profile's AssignmentManager calls, just
// entered from the subject's side instead of the teacher's: useful when
// what an admin has in front of them is "Chemistry has nobody," not "which
// teacher should I open."
export function SubjectCoverage({
  subjectId,
  subjectName,
  assignments,
  classes,
  teachers,
}: {
  subjectId: string;
  subjectName: string;
  assignments: SubjectAssignment[];
  classes: ClassOption[];
  teachers: TeacherOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SubjectAssignment | null>(null);

  const teacherCount = new Set(assignments.map((a) => a.teacherId)).size;

  const handleAdd = () => {
    if (!teacherId || !classId) {
      setError("Select both a teacher and a class.");
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
      setClassId("");
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
            aria-label={`${subjectName} — ${teacherCount === 0 ? "no teacher assigned" : `${teacherCount} teacher${teacherCount === 1 ? "" : "s"} assigned`}`}
            className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            {teacherCount === 0 ? (
              <Badge variant="warning">None</Badge>
            ) : (
              <span className="text-brand hover:underline">{teacherCount}</span>
            )}
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-md text-left">
          <DialogHeader>
            <DialogTitle>{subjectName}</DialogTitle>
            <DialogDescription>
              {assignments.length === 0
                ? "No teacher is assigned to this subject yet."
                : `${teacherCount} teacher${teacherCount === 1 ? "" : "s"}, across ${assignments.length} class${assignments.length === 1 ? "" : "es"}.`}
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
                    <Link href={`/portal/admin/teachers/${a.teacherId}`} className="text-brand hover:underline">
                      {a.teacherName}
                    </Link>
                    <span className="text-muted-foreground"> — {a.className}</span>
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
            {classes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No classes run this subject's level.</p>
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
                <div className="w-32">
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
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
              Remove {removeTarget?.teacherName} from {subjectName} — {removeTarget?.className}?
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
