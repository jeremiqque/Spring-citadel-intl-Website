import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { getTermPublishSummary } from "@/lib/term-result";
import { AcademicPeriodForm } from "../settings-forms";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

export default async function AcademicPeriodSettingsPage() {
  const [sessionSetting, termSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
  ]);

  const currentSession = sessionSetting?.value ?? "";
  const currentTerm = (termSetting?.value as TermValue | undefined) ?? "TERM_1";

  // Only meaningful once a session is actually set — see
  // AcademicPeriodForm's own comment on why this is a heads-up, not a gate.
  const readiness = currentSession
    ? await getTermPublishSummary(currentSession, currentTerm)
    : null;

  return (
    <div className="space-y-6">
      <BackLink href="/portal/admin/settings" label="Back to settings" />
      <h1 className="text-2xl font-semibold text-foreground">Academic period</h1>
      <div className="max-w-2xl">
        <AcademicPeriodForm
          initialSession={currentSession}
          initialTerm={currentTerm}
          readiness={readiness}
        />
      </div>
    </div>
  );
}
