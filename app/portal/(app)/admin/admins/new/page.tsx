import { AdminForm } from "../admin-form";
import { BackLink } from "@/components/ui/back-link";

export default function NewAdminPage() {
  return (
    <div className="space-y-6">
      <BackLink href="/portal/admin/admins" label="Back to admins" />
      <h1 className="text-2xl font-semibold text-foreground">Add an admin</h1>
      <AdminForm />
    </div>
  );
}
