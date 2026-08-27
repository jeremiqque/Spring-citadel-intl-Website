import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, Award01Icon, LockPasswordIcon } from "@hugeicons/core-free-icons";
import { prisma } from "@/lib/prisma";

type SettingsCardDef = {
  href: string;
  icon: typeof Calendar01Icon;
  title: string;
  description: string;
};

type SettingsGroup = {
  section: string;
  items: SettingsCardDef[];
};

// Grouped the same way the sidebar itself groups nav items (see NAV in
// portal-shell.tsx) — "Academic" for the two values that feed grade entry
// and results, "Account" for the one thing every admin manages about
// themselves. Only real, working destinations: this used to be three forms
// stacked on one long page with no way to jump straight to one, which was
// fine at three but wouldn't have scaled — and it's the same rule the nav
// itself follows (see the comment on NAV): a card that doesn't resolve to a
// real page reads as a broken settings screen, not a "coming soon" one, so
// nothing here is a placeholder.
const GROUPS: SettingsGroup[] = [
  {
    section: "Academic",
    items: [
      {
        href: "/portal/admin/settings/academic-period",
        icon: Calendar01Icon,
        title: "Academic period",
        description: "The session and term new grades are filed under.",
      },
      {
        href: "/portal/admin/settings/grading-policy",
        icon: Award01Icon,
        title: "Grading policy",
        description: "Letter-grade cutoffs and the at-risk threshold.",
      },
    ],
  },
  {
    section: "Account",
    items: [
      {
        href: "/portal/admin/settings/password",
        icon: LockPasswordIcon,
        title: "Your password",
        description: "Change the password for the account you're signed in with.",
      },
    ],
  },
];

function SettingsCard({ href, icon, title, description }: SettingsCardDef) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-brand/40 hover:bg-brand/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand">
        <HugeiconsIcon icon={icon} size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}

// The settings landing page. Used to be the forms themselves, stacked one
// after another — Academic period, then Grading policy, then Your password,
// all open at once whether you came here for one of them or not. This is a
// directory instead: a grouped grid of cards, each one the real entry point
// to a single settings page (see the academic-period/, grading-policy/ and
// password/ subroutes). The "no session set" warning stays here rather than
// only on the Academic period page, because it's the thing that should catch
// an admin's eye the moment they open Settings for any reason — grade entry
// is disabled school-wide until it's fixed.
export default async function AdminSettingsPage() {
  const sessionSetting = await prisma.setting.findUnique({ where: { key: "currentSession" } });
  const currentSession = sessionSetting?.value ?? "";

  return (
    <div className="space-y-8">
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
            Grade entry is disabled for every teacher until this is filled in — see{" "}
            <Link href="/portal/admin/settings/academic-period" className="text-brand hover:underline">
              Academic period
            </Link>
            .
          </p>
        </div>
      )}

      {GROUPS.map((group) => (
        <section key={group.section} className="space-y-3">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {group.section}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <SettingsCard key={item.href} {...item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
