import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { AcademicPeriodForm } from "../settings-forms";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

export default async function AcademicPeriodSettingsPage() {
  const [sessionSetting, termSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
  ]);

  const currentSession = sessionSetting?.value ?? "";
  const currentTerm = (termSetting?.value as TermValue | undefined) ?? "TERM_1";

  return (
    <div className="space-y-6">
      <BackLink href="/portal/admin/settings" label="Back to settings" />
      <h1 className="text-2xl font-semibold text-foreground">Academic period</h1>
      <div className="max-w-2xl">
        <AcademicPeriodForm initialSession={currentSession} initialTerm={currentTerm} />
      </div>
    </div>
  );
}
