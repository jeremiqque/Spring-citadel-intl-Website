import { prisma } from "@/lib/prisma";
import { getGradingConfig } from "@/lib/grading-settings";
import { AcademicPeriodForm, GradingPolicyForm } from "./settings-forms";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

/**
 * Admin settings.
 *
 * Two things live here, both of which used to be reachable only by editing
 * the database or the source:
 *
 *   1. The academic period (session + term). The grades screen told admins to
 *      "ask whoever administers the database" to set it — for a value that
 *      changes three times a year and without which grade entry is disabled.
 *   2. The grade bands and at-risk rule, which shipped as placeholder
 *      constants marked "NOT YET CONFIRMED BY THE SCHOOL."
 *
 * Both are Setting rows. Neither is a migration.
 */
export default async function AdminSettingsPage() {
  const [sessionSetting, termSetting, gradingConfig] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
    getGradingConfig(),
  ]);

  const currentSession = sessionSetting?.value ?? "";
  const currentTerm = (termSetting?.value as TermValue | undefined) ?? "TERM_1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          School-wide values that used to require a code change or direct database access.
        </p>
      </div>

      {currentSession === "" && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground"
        >
          <p className="font-medium">No academic session is set.</p>
          <p className="mt-1 text-muted-foreground">
            Grade entry is disabled for every teacher until this is filled in, because each
            result is filed against a session.
          </p>
        </div>
      )}

      <AcademicPeriodForm initialSession={currentSession} initialTerm={currentTerm} />
      <GradingPolicyForm initial={gradingConfig} />
    </div>
  );
}
