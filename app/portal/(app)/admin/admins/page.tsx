import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AdminRowActions } from "./admin-row-actions";

// No search/filter/pagination here, unlike Teachers and Students — a school
// realistically has a small handful of admin accounts, not hundreds, and
// this whole screen exists for one narrow purpose (see actions.ts's
// comment): giving a second admin a way to reset the first admin's
// password, not day-to-day roster management.
export default async function AdminsPage() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, mustChangePassword: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Admins</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anyone here can reset anyone else&apos;s password — including yours, if you&apos;re
            ever locked out. Keep at least two admin accounts for exactly that reason.
          </p>
        </div>
        <Button asChild>
          <Link href="/portal/admin/admins/new">Add admin</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table caption="Admin accounts">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No admin accounts found.
                </TableCell>
              </TableRow>
            )}
            {admins.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.name}</TableCell>
                <TableCell className="text-muted-foreground">{a.email}</TableCell>
                <TableCell>
                  {a.mustChangePassword ? (
                    <Badge variant="warning">Pending first login</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {a.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <AdminRowActions adminId={a.id} adminName={a.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
