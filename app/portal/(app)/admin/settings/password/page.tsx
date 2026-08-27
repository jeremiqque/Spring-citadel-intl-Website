import { BackLink } from "@/components/ui/back-link";
import { ChangePasswordForm } from "../settings-forms";

export default async function PasswordSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  const { passwordChanged } = await searchParams;

  return (
    <div className="space-y-6">
      <BackLink href="/portal/admin/settings" label="Back to settings" />
      <h1 className="text-2xl font-semibold text-foreground">Your password</h1>

      {passwordChanged === "1" && (
        <div
          role="status"
          className="rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-3 text-sm text-foreground"
        >
          <p className="font-medium">Password changed.</p>
          <p className="mt-1 text-muted-foreground">
            Any other device signed in to this account has been signed out.
          </p>
        </div>
      )}

      <div className="max-w-2xl">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
