"use client";

import { useState } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { StudentRowActions } from "./student-row-actions";

type StudentRow = {
  id: string;
  admissionNo: string;
  name: string;
  className: string;
  gender: string;
  status: string;
};

function statusBadgeVariant(status: string): "success" | "warning" | "outline" {
  if (status === "ACTIVE") return "success";
  if (status === "AT_RISK") return "warning";
  return "outline"; // INACTIVE
}

/**
 * The students table, as a client component so it can hold selection state
 * — a checkbox per row plus a "select all (this page)" checkbox in the
 * header, the way the request described it: single or bulk select. This is
 * selection scaffolding only; Export and Print (in the server-rendered
 * filter row above this component) are still the "coming soon" placeholders
 * they already were and will read this selection once they go live, rather
 * than each bulk action reinventing its own checkbox column.
 *
 * Split out of page.tsx (an async server component, which can't hold
 * useState) the same way StudentRowActions already had to be — one client
 * island for interactivity, with the data fetch and filter form staying
 * server-rendered.
 */
export function StudentTable({ students }: { students: StudentRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = students.length > 0 && students.every((s) => selected.has(s.id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map((s) => s.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">
          <span className="font-medium text-foreground">
            {selected.size} student{selected.size === 1 ? "" : "s"} selected
          </span>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="rounded-lg border border-border">
        <Table caption="Enrolled students matching the current filters">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label={allSelected ? "Deselect all students on this page" : "Select all students on this page"}
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  disabled={students.length === 0}
                />
              </TableHead>
              <TableHead>Admission No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No students match these filters.
                </TableCell>
              </TableRow>
            )}
            {students.map((s) => (
              <TableRow key={s.id} data-state={selected.has(s.id) ? "selected" : undefined} className="data-[state=selected]:bg-primary/5">
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${s.name}`}
                    checked={selected.has(s.id)}
                    onCheckedChange={() => toggleOne(s.id)}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                <TableCell>
                  <Link href={`/portal/admin/students/${s.id}`} className="hover:underline">
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell>{s.className}</TableCell>
                <TableCell className="capitalize">{s.gender.toLowerCase()}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(s.status)}>{s.status.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <StudentRowActions studentId={s.id} studentName={s.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
