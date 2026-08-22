"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { addAssignmentAction, removeAssignmentAction } from "../actions";

type Assignment = {
  id: string;
  className: string;
  subjectName: string;
  submissionStatus: "Not started" | "In progress" | "Submitted";
  hasSubmittedGradesEver: boolean;
};
type ClassOption = { id: string; name: string; level: string };
type SubjectOption = { id: string; name: string; levels: string[] };

export function AssignmentManager({
  teacherId,
  assignments,
  classes,
  subjects,
}: {
  teacherId: string;
  assignments: Assignment[];
  classes: ClassOption[];
  subjects: SubjectOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null);

  const selectedClass = classes.find((c) => c.id === classId);
  const availableSubjects = selectedClass
    ? subjects.filter((s) => s.levels.includes(selectedClass.level))
    : subjects;

  const handleAdd = () => {
    if (!classId || !subjectId) {
      setError("Select both a class and a subject.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addAssignmentAction(teacherId, classId, subjectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setClassId("");
      setSubjectId("");
      router.refresh();
    });
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    startTransition(async () => {
      const result = await removeAssignmentAction(removeTarget.id, teacherId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRemoveTarget(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Select
            value={classId}
            onValueChange={(v) => {
              setClassId(v);
              setSubjectId("");
            }}
          >
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
        <div className="w-48">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              {availableSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={isPending}>
          Add assignment
        </Button>
      </div>
      {/* Only the add-assignment error belongs here — a remove-assignment
          error is shown inside its own confirm dialog below instead, since
          that dialog is still open when the failure happens and this spot
          is behind it. */}
      {error && !removeTarget && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes assigned yet.</p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table caption="This teacher's class and subject assignments">
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Submission status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.className}</TableCell>
                  <TableCell>{a.subjectName}</TableCell>
                  <TableCell>{a.submissionStatus}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Clear any stale add-assignment error before
                        // opening this dialog.
                        setError(null);
                        setRemoveTarget(a);
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove {removeTarget?.className} — {removeTarget?.subjectName}?
            </DialogTitle>
            <DialogDescription>
              {removeTarget?.hasSubmittedGradesEver
                ? "This class/subject has submitted grades on record from this teacher. Removing the assignment does not delete those grades, but the teacher will lose access to enter or edit any more for it."
                : "The teacher will no longer be able to enter grades for this class and subject."}
            </DialogDescription>
          </DialogHeader>
          {/* Previously a failed removal set `error` but rendered it in the
              page body, not inside this still-open dialog — invisible
              behind the modal overlay. This is the fix. */}
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
              {isPending ? "Removing…" : "Remove assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
