import { AdminForm } from "../admin-form";

export default function NewAdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Add an admin</h1>
      <AdminForm />
    </div>
  );
}
