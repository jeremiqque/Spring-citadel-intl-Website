import { prisma } from "@/lib/prisma";
import { getGradingConfig } from "@/lib/grading-settings";
import { AcademicPeriodForm, GradingPolicyForm, ChangePasswordForm } from "./settings-forms";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

/**
 * Admin settings.
 *
 * Three things live here:
 *
 *   1. The academic period (session + term). The grades screen told admins to
 *      "ask whoever administers the database" to set it — for a value that
 *      changes three times a year and without which grade entry is disabled.
 *   2. The grade bands and at-risk rule, which shipped as placeholder
 *      constants marked "NOT YET CONFIRMED BY THE SCHOOL."
 *   3. Your own password — previously only changeable by hand-editing the
 *      database to force mustChangePassword back to true and reusing the
 *      first-login screen. See changePasswordAction in ../../actions.ts.
 *
 * The first two are Setting rows; neither is a migration.
 */
export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  const [{ passwordChanged }, sessionSetting, termSetting, gradingConfig] = await Promise.all([
    searchParams,
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
      <ChangePasswordForm />
    </div>
  );
}
