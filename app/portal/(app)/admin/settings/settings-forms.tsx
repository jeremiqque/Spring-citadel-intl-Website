"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FilterSelect } from "@/components/ui/filter-select";
import {
  type GradingConfig,
  validateGradingConfig,
  DEFAULT_GRADING_CONFIG,
} from "@/lib/grading";
import { TERM_LABEL, TERM_ORDER, type TermValue } from "@/lib/academic-period";
import { setAcademicPeriodAction, setGradingConfigAction } from "./actions";
import { changePasswordAction } from "../../actions";

// "2026/2027" -> "2027/2028". Anything that doesn't parse (a school's first
// year, or a session string an admin typed by hand) comes back unchanged —
// a starting point to edit, never a value forced on them.
function nextSessionLabel(session: string): string {
  const m = /^(\d{4})\/(\d{4})$/.exec(session.trim());
  if (!m) return session;
  return `${Number(m[1]) + 1}/${Number(m[2]) + 1}`;
}

/* ── Academic period ─────────────────────────────────────────────────────── */

export function AcademicPeriodForm({
  initialSession,
  initialTerm,
  readiness,
}: {
  initialSession: string;
  initialTerm: TermValue;
  /** How many gradeable classes have fully PUBLISHED results for
   *  initialSession/initialTerm right now — null when there's no session
   *  set yet to check. Only ever shown as a heads-up, never a block; see
   *  lib/academic-period.ts's assertCurrentTerm for where the actual lock
   *  (teacher entry only in the current term) lives. */
  readiness: { totalClasses: number; pendingClassNames: string[] } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [session, setSession] = useState(initialSession);
  const [term, setTerm] = useState<TermValue>(initialTerm);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [newSession, setNewSession] = useState(() => nextSessionLabel(initialSession));

  const dirty = session !== initialSession || term !== initialTerm;

  const isFinalTerm = initialTerm === "TERM_3";
  const nextTerm: TermValue | null = isFinalTerm
    ? null
    : TERM_ORDER[TERM_ORDER.indexOf(initialTerm) + 1];
  const pendingCount = readiness?.pendingClassNames.length ?? 0;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await setAcademicPeriodAction(session, term);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setConfirmOpen(false);
      router.refresh();
    });
  };

  // The guided path: Term 1 -> 2 -> 3 says "Advance to the next term," and
  // once the school is already on Term 3 the exact same button becomes
  // "Start new session" — same underlying setAcademicPeriodAction, just
  // aimed at a new session name + TERM_1 instead of TERM_2/3. This is the
  // one-click case; the Session/Term fields above stay for the other case —
  // correcting a typo, or reopening an earlier term for a correction.
  const runAdvance = () => {
    setError(null);
    startTransition(async () => {
      const targetSession = isFinalTerm ? newSession : initialSession;
      const targetTerm: TermValue = isFinalTerm ? "TERM_1" : nextTerm!;
      const result = await setAcademicPeriodAction(targetSession, targetTerm);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSession(targetSession);
      setTerm(targetTerm);
      setSaved(true);
      setAdvanceOpen(false);
      router.refresh();
    });
  };

  return (
    <section className="rounded-lg border border-border p-4">
      <p className="mt-1 text-xs text-muted-foreground">
        Every result is filed against a session and term. New grades are recorded under
        whatever is set here, and it&apos;s the only term open for teachers to enter grades
        and psychomotor ratings in — a past or future term is read-only for them until you
        move this here.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Currently open: {TERM_LABEL[initialTerm]}
            {initialSession ? `, ${initialSession}` : ""}
          </p>
          {readiness && readiness.totalClasses > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pendingCount === 0
                ? `All ${readiness.totalClasses} gradeable class${readiness.totalClasses === 1 ? "" : "es"} have published results for ${TERM_LABEL[initialTerm]}.`
                : `${pendingCount} of ${readiness.totalClasses} gradeable class${readiness.totalClasses === 1 ? "" : "es"} ${pendingCount === 1 ? "hasn't" : "haven't"} published results for ${TERM_LABEL[initialTerm]} yet.`}
            </p>
          )}
        </div>
        <Button size="field" variant="secondary" onClick={() => setAdvanceOpen(true)} disabled={isPending}>
          {isFinalTerm ? "Start new session" : `Advance to ${TERM_LABEL[nextTerm!]}`}
        </Button>
      </div>

      <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
        <DialogContent className="text-left">
          <DialogHeader>
            <DialogTitle>
              {isFinalTerm
                ? "Start a new session?"
                : `Advance to ${TERM_LABEL[nextTerm!]}?`}
            </DialogTitle>
            <DialogDescription>
              {isFinalTerm
                ? `${TERM_LABEL[initialTerm]} was the last term of ${initialSession}. Teachers lose entry access to it the moment you start the new session — you can still correct it yourself, or reopen it here if you need to.`
                : `Teachers lose entry access to ${TERM_LABEL[initialTerm]} the moment you advance — it becomes read-only for them. You can still correct it yourself, or reopen it here if you need to.`}
              {pendingCount > 0 && (
                <>
                  {" "}
                  <span className="font-medium text-foreground">
                    Heads up: {pendingCount} of {readiness?.totalClasses} class
                    {readiness?.totalClasses === 1 ? "" : "es"} — {readiness?.pendingClassNames.join(", ")} —
                    {pendingCount === 1 ? " hasn't" : " haven't"} published results for {TERM_LABEL[initialTerm]} yet.
                  </span>{" "}
                  You can still advance now; nothing stops you from publishing them later.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {isFinalTerm && (
            <div>
              <Label htmlFor="newSession">New session</Label>
              <Input
                id="newSession"
                value={newSession}
                placeholder="2027/2028"
                inputMode="numeric"
                className="mt-1"
                onChange={(e) => setNewSession(e.target.value)}
              />
              {/* A mention, not a gate — starting the new session and
                  promoting students are two separate admin actions on
                  purpose (see app/portal/(app)/admin/promotions), so this
                  links to that screen rather than forcing it before
                  continuing. Some schools may want to review promotions
                  before the new session opens, others after; either order
                  works, and this dialog only ever changes the session/term. */}
              <p className="mt-2 text-xs text-muted-foreground">
                This only opens the new session — it doesn&apos;t move any students. Promote or hold
                back students separately on the{" "}
                <a href="/portal/admin/promotions" className="underline hover:text-foreground">
                  Promotions
                </a>{" "}
                page, before or after starting the session.
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" size="lg" disabled={isPending} onClick={() => setAdvanceOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" onClick={runAdvance} disabled={isPending}>
              {isPending ? "Saving…" : isFinalTerm ? "Start new session" : "Advance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="mt-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Set it manually
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        For a correction, or to reopen an earlier term — this sets the open period directly
        instead of stepping forward one term at a time.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="session">Session</Label>
          <Input
            id="session"
            value={session}
            placeholder="2026/2027"
            inputMode="numeric"
            className="mt-1 h-9 w-36"
            onChange={(e) => {
              setSaved(false);
              setError(null);
              setSession(e.target.value);
            }}
          />
        </div>
        <div>
          <Label htmlFor="term">Term</Label>
          <FilterSelect
            id="term"
            value={term}
            className="w-36"
            onValueChange={(v) => {
              setSaved(false);
              setError(null);
              setTerm(v as TermValue);
            }}
            options={(Object.keys(TERM_LABEL) as TermValue[]).map((t) => ({ value: t, label: TERM_LABEL[t] }))}
          />
        </div>
        <Button
          size="field"
          disabled={isPending || !dirty}
          onClick={() => setConfirmOpen(true)}
        >
          {isPending ? "Saving…" : saved && !dirty ? "Saved" : "Save period"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Rolling the term is the moment the whole school's default view moves.
          It is reversible — no grade row is touched — but it is not the kind
          of thing to do by mis-clicking a select. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="text-left">
          <DialogHeader>
            <DialogTitle>Move the school to {TERM_LABEL[term]}, {session}?</DialogTitle>
            <DialogDescription>
              Grades already recorded keep the session and term they were entered under —
              nothing is deleted or re-filed. What changes is where new grades go, which
              term every dashboard opens on, and which term teachers can enter grades and
              ratings into — {TERM_LABEL[term]} becomes the only one open to them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="lg" disabled={isPending} onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" onClick={save} disabled={isPending}>
              {isPending ? "Saving…" : "Change period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ── Grading policy ──────────────────────────────────────────────────────── */

type BandKey = "A" | "B" | "C" | "D";
const BAND_ORDER: BandKey[] = ["A", "B", "C", "D"];

export function GradingPolicyForm({ initial }: { initial: GradingConfig }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState<GradingConfig>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The same validator the action runs, so the form can never accept
  // something the server will reject — and can explain it before the
  // round trip.
  const problems = validateGradingConfig(config);
  const dirty = JSON.stringify(config) !== JSON.stringify(initial);

  const setBand = (key: BandKey, raw: string) => {
    setSaved(false);
    setError(null);
    setConfig((c) => ({ ...c, bands: { ...c.bands, [key]: raw === "" ? NaN : Number(raw) } }));
  };

  const setNumber = (key: "atRiskThreshold" | "atRiskMinSubjects", raw: string) => {
    setSaved(false);
    setError(null);
    setConfig((c) => ({ ...c, [key]: raw === "" ? NaN : Number(raw) }));
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await setGradingConfigAction(config);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  const display = (n: number) => (Number.isFinite(n) ? String(n) : "");

  return (
    <section className="rounded-lg border border-border p-4">
      <p className="mt-1 text-xs text-muted-foreground">
        The minimum total (out of 100) for each letter, and the rule that flags a student
        as at-risk. These were developer placeholders until the school confirmed them —
        set them here rather than asking for a code change.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {BAND_ORDER.map((key) => (
          <div key={key}>
            <Label htmlFor={`band-${key}`}>{key} from</Label>
            <Input
              id={`band-${key}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={display(config.bands[key])}
              onChange={(e) => setBand(key, e.target.value)}
              className="mt-1 h-9 w-24"
              aria-label={`Minimum total for grade ${key}`}
            />
          </div>
        ))}
        <p className="pb-2 text-xs text-muted-foreground">
          Below {display(config.bands.D) || "—"} is F.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="at-risk-threshold">At-risk below</Label>
          <Input
            id="at-risk-threshold"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={display(config.atRiskThreshold)}
            onChange={(e) => setNumber("atRiskThreshold", e.target.value)}
            className="mt-1 h-9 w-24"
          />
        </div>
        <div>
          <Label htmlFor="at-risk-min">After this many subjects</Label>
          <Input
            id="at-risk-min"
            type="number"
            inputMode="numeric"
            min={1}
            value={display(config.atRiskMinSubjects)}
            onChange={(e) => setNumber("atRiskMinSubjects", e.target.value)}
            className="mt-1 h-9 w-24"
          />
        </div>
        <Button size="field" onClick={save} disabled={isPending || !dirty || problems.length > 0}>
          {isPending ? "Saving…" : saved && !dirty ? "Saved" : "Save policy"}
        </Button>
        <Button
          size="field"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setSaved(false);
            setError(null);
            setConfig(DEFAULT_GRADING_CONFIG);
          }}
        >
          Reset to defaults
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        A student is flagged at-risk when their term average across submitted subjects falls
        below {display(config.atRiskThreshold) || "—"}, once at least{" "}
        {display(config.atRiskMinSubjects) || "—"} subject
        {config.atRiskMinSubjects === 1 ? " has" : "s have"} been submitted.
      </p>

      {problems.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1 text-xs text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Stated on the screen, not just in a code comment — an admin editing
          these needs to know what does and does not change retroactively. */}
      <p className="mt-3 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
        Changing the bands does not rewrite results that have already been submitted — a
        letter a student has already been shown stays as it was. New entries, and averages
        computed across subjects, use the new bands straight away.
      </p>
    </section>
  );
}

/* ── Your password ───────────────────────────────────────────────────────── */

// Deliberately your-own-password only — not "reset someone else's". An
// admin resetting another user's forgotten password is a different feature
// (it doesn't require knowing their current one) and belongs on that
// person's own admin/teacher/student row, not here.
export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const dirty = currentPassword !== "" || newPassword !== "" || confirmPassword !== "";

  const save = () => {
    setError(null);
    startTransition(async () => {
      // On success this action redirects (see the comment on
      // changePasswordAction) rather than returning — this line is only
      // reached at all when it failed validation or the current password
      // was wrong, so there is no "ok" branch to handle here.
      const result = await changePasswordAction(
        { currentPassword, newPassword, confirmPassword },
        "/portal/admin/settings/password"
      );
      setError(result.error);
    });
  };

  return (
    <section className="rounded-lg border border-border p-4">
      <p className="mt-1 text-xs text-muted-foreground">
        Change the password for the account you&apos;re signed in with. This signs every other
        device out — anywhere else that account is still logged in will be asked to sign in
        again.
      </p>

      <div className="mt-4 grid gap-3 sm:max-w-sm">
        <div>
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            className="mt-1 h-9"
            onChange={(e) => {
              setError(null);
              setCurrentPassword(e.target.value);
            }}
          />
        </div>
        <div>
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            className="mt-1 h-9"
            onChange={(e) => {
              setError(null);
              setNewPassword(e.target.value);
            }}
          />
          <p className="mt-1 text-xs text-muted-foreground">At least 10 characters.</p>
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            className="mt-1 h-9"
            onChange={(e) => {
              setError(null);
              setConfirmPassword(e.target.value);
            }}
          />
        </div>

        <Button size="field" className="mt-1 w-fit" onClick={save} disabled={isPending || !dirty}>
          {isPending ? "Saving…" : "Change password"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
