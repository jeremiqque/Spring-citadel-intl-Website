import { getGradingConfig } from "@/lib/grading-settings";
import { BackLink } from "@/components/ui/back-link";
import { GradingPolicyForm } from "../settings-forms";

export default async function GradingPolicySettingsPage() {
  const gradingConfig = await getGradingConfig();

  return (
    <div className="space-y-6">
      <BackLink href="/portal/admin/settings" label="Back to settings" />
      <h1 className="text-2xl font-semibold text-foreground">Grading policy</h1>
      <div className="max-w-2xl">
        <GradingPolicyForm initial={gradingConfig} />
      </div>
    </div>
  );
}
