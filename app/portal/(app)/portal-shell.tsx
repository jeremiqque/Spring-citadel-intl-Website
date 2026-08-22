"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare02Icon,
  UserGroupIcon,
  TeacherIcon,
  BarChartIcon,
  Book01Icon,
  PencilEdit01Icon,
  UserCircleIcon,
  BellIcon,
  ArrowLeftDoubleIcon,
  UserIcon,
  Search01Icon,
  ArrowDown01Icon,
  AiMagicIcon,
  Logout03Icon,
  Menu01Icon,
  Settings02Icon,
  ShieldUserIcon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { signOutAction } from "./actions";

type Role = "ADMIN" | "TEACHER" | "STUDENT";
type IconType = typeof DashboardSquare02Icon;

type NavItem = { label: string; href: string; icon: IconType };
type NavSection = { section: string; items: NavItem[] };

// Account-menu items, per role — the first group in the avatar dropdown,
// above Notifications and Sign out. Deliberately only routes that exist:
// ADMIN and TEACHER have no personal pages yet, so their menu opens straight
// at Notifications rather than carrying rows that 404. Add here when the
// pages land, not before.
const ACCOUNT_ITEMS: Record<Role, NavItem[]> = {
  ADMIN: [],
  TEACHER: [],
  STUDENT: [
    { label: "My profile", href: "/portal/student/profile", icon: UserCircleIcon },
    { label: "My results", href: "/portal/student/grades", icon: BarChartIcon },
  ],
};

// Sidebar matches the "Admin Menu" Figma frame (node 4049:3910) — grouped
// sections (MAIN / ACADEMIC / SYSTEM), same HugeIcons glyphs. TEACHER and
// STUDENT don't have their own Figma mock yet, so they reuse the same
// visual pattern with role-appropriate items instead of inventing a
// different look.
//
// Every href here resolves to a real page. If you add one before its page
// exists, say so in a comment — a nav item that 404s is indistinguishable
// from a broken route to the person clicking it.
const NAV: Record<Role, NavSection[]> = {
  ADMIN: [
    {
      section: "MAIN",
      items: [
        { label: "Dashboard", href: "/portal/admin", icon: DashboardSquare02Icon },
        { label: "Students", href: "/portal/admin/students", icon: UserGroupIcon },
        { label: "Teachers", href: "/portal/admin/teachers", icon: TeacherIcon },
      ],
    },
    {
      section: "ACADEMIC",
      items: [
        { label: "Grades", href: "/portal/admin/grades", icon: BarChartIcon },
        { label: "Classes", href: "/portal/admin/classes", icon: Book01Icon },
        { label: "Subjects", href: "/portal/admin/subjects", icon: PencilEdit01Icon },
      ],
    },
    {
      section: "SYSTEM",
      items: [
        { label: "Notifications", href: "/portal/notifications", icon: BellIcon },
        { label: "Admins", href: "/portal/admin/admins", icon: ShieldUserIcon },
        { label: "Settings", href: "/portal/admin/settings", icon: Settings02Icon },
      ],
    },
  ],
  TEACHER: [
    {
      section: "MAIN",
      items: [{ label: "Dashboard", href: "/portal/teacher", icon: DashboardSquare02Icon }],
    },
    {
      section: "ACADEMIC",
      items: [
        { label: "My Classes", href: "/portal/teacher/classes", icon: Book01Icon },
        { label: "Grade Entry", href: "/portal/teacher/grades", icon: PencilEdit01Icon },
      ],
    },
    {
      section: "SYSTEM",
      items: [{ label: "Notifications", href: "/portal/notifications", icon: BellIcon }],
    },
  ],
  STUDENT: [
    {
      section: "MAIN",
      items: [
        { label: "Dashboard", href: "/portal/student", icon: DashboardSquare02Icon },
        { label: "Profile", href: "/portal/student/profile", icon: UserCircleIcon },
      ],
    },
    {
      section: "ACADEMIC",
      items: [{ label: "My Results", href: "/portal/student/grades", icon: BarChartIcon }],
    },
    {
      section: "SYSTEM",
      items: [{ label: "Notifications", href: "/portal/notifications", icon: BellIcon }],
    },
  ],
};

// The crest + wordmark block. `collapsed` only ever applies to the desktop
// rail; the mobile drawer always shows the full lockup because it has the
// width for it.
function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-[10px]">
      <Image src="/crest.png" alt="" width={37} height={37} className="size-[37px] shrink-0 object-contain" />
      {!collapsed && (
        <div className="min-w-0 leading-tight text-sidebar-foreground">
          <p className="truncate text-[16px]">Spring Citadel</p>
          <p className="truncate text-[12px]">International School</p>
        </div>
      )}
    </div>
  );
}

// Nav + signed-in-user footer, shared verbatim by the desktop rail and the
// mobile drawer so the two can never drift apart.
function SidebarBody({
  sections,
  pathname,
  collapsed,
  name,
  role,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  collapsed: boolean;
  name: string;
  role: Role;
  onNavigate?: () => void;
}) {
  return (
    <>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-[15px] overflow-y-auto px-2.5 pt-6">
        {sections.map((section) => (
          <div key={section.section} className="flex flex-col gap-[10px]">
            {!collapsed && (
              <p className="px-[10px] text-[10px] text-sidebar-foreground/80">{section.section}</p>
            )}
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={
                    "relative flex items-center gap-[10px] p-[10px] text-[14px] whitespace-nowrap transition-colors " +
                    (collapsed ? "justify-center " : "") +
                    (active ? "bg-brand/10 text-brand" : "text-sidebar-foreground hover:bg-foreground/5")
                  }
                >
                  {active && (
                    <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 bg-brand" aria-hidden />
                  )}
                  <HugeiconsIcon icon={item.icon} size={24} className="shrink-0" />
                  {/* Collapsed, the label is the link's only accessible name,
                      so it stays in the DOM as sr-only rather than being
                      dropped in favour of a `title` (which screen readers
                      treat inconsistently and touch users never see). */}
                  <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex shrink-0 flex-col items-center justify-center px-2.5 pb-8">
        <div className="flex w-full min-w-0 items-center justify-center gap-[10px]">
          <HugeiconsIcon icon={UserIcon} size={24} className="shrink-0 text-sidebar-foreground" />
          {!collapsed && (
            <div className="min-w-0 leading-tight text-sidebar-foreground">
              <p className="truncate text-[14px] font-medium">{name}</p>
              <p className="truncate text-[10px] capitalize">{role.toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function PortalShell({
  role,
  name,
  email,
  unreadCount,
  children,
}: {
  role: Role;
  name: string;
  email: string;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = NAV[role];
  const accountItems = ACCOUNT_ITEMS[role];

  // Close the drawer whenever the route changes. Without this, tapping a nav
  // item leaves the drawer sitting over the page it just navigated to.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    // .portal here is the ONE place that matters: this is the shell every
    // authenticated page renders inside, so it's what actually activates the
    // scoped shadcn tokens from step 13 for the whole app (login/first-login
    // apply their own .portal directly, since they render before this shell
    // exists in the tree).
    <div className="portal flex min-h-screen">
      {/* Skip link — first thing in the tab order, so a keyboard user can
          jump past the nav instead of traversing it on every page load. */}
      <a
        href="#portal-main"
        className="sr-only z-50 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>

      {/* DESKTOP RAIL — lg and up only. Below lg the same nav lives in the
          drawer below, so there is exactly one nav in the accessibility tree
          at any width. */}
      <aside
        className={
          (collapsed ? "lg:w-[76px]" : "lg:w-[220px]") +
          " hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex"
        }
      >
        {/* This block's height is coupled to the <header> below: both are
            90px at lg so their bottom borders meet in one continuous line
            (Figma node 4268:6200). Change one and you must change the other.
            Below lg the rail is hidden, so the header is free to shrink. */}
        <div
          className={
            "flex h-[90px] shrink-0 items-center border-b border-sidebar-border px-4 " +
            (collapsed ? "justify-center" : "justify-between")
          }
        >
          <SidebarBrand collapsed={collapsed} />
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              // This corner radius used to be a hardcoded, one-off Figma
              // pixel value with no equivalent in the app's actual radius
              // scale (sm/md/lg/xl - see globals.css's --radius-* tokens).
              // The small utility below is the nearest real step, so this
              // button's corners now scale with --radius like everything
              // else instead of being frozen at an arbitrary value.
              className="flex size-[23px] shrink-0 items-center justify-center rounded-sm bg-muted-foreground text-background"
            >
              <HugeiconsIcon icon={ArrowLeftDoubleIcon} size={18} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="mx-auto mt-3 flex size-[23px] shrink-0 rotate-180 items-center justify-center rounded-sm bg-muted-foreground text-background"
          >
            <HugeiconsIcon icon={ArrowLeftDoubleIcon} size={18} />
          </button>
        )}

        <SidebarBody
          sections={sections}
          pathname={pathname}
          collapsed={collapsed}
          name={name}
          role={role}
        />
      </aside>

      {/* MOBILE DRAWER — below lg. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent>
          <SheetTitle>Navigation</SheetTitle>
          <div className="flex h-[72px] shrink-0 items-center border-b border-sidebar-border px-4">
            <SidebarBrand collapsed={false} />
          </div>
          <SidebarBody
            sections={sections}
            pathname={pathname}
            collapsed={false}
            name={name}
            role={role}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* min-w-0 is load-bearing: without it this flex child refuses to
          shrink below the intrinsic width of its widest content (a wide
          table), and the whole page scrolls horizontally instead of the
          table scrolling inside its own container. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* One control scale for the whole bar: every control here is h-8
            with a 16px glyph, which is exactly Button size="lg" / "icon-lg".
            Colours are tokens (border-input, border-border, muted-foreground)
            rather than hexes, so the .dark block in globals.css takes effect.

            Responsive order of sacrifice as width drops: the search field
            goes first (md), then the Ask AI label (sm), then Ask AI itself.
            The bell and account menu never go — they are the only route to
            notifications and sign-out. */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4 lg:h-[90px] lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon-lg"
              className="lg:hidden"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <HugeiconsIcon icon={Menu01Icon} size={16} />
            </Button>

            {/* Search is still visual only — no wiring to students/teachers
                yet, that is a later package. Mirrors Input's own token set
                so it reads as a real field, at the bar's h-8.

                The focus ring is on the WRAPPER (the inner input keeps
                outline-none deliberately, so the ring surrounds the whole
                field including its icon). It draws --focus-ring rather than
                the old ring-ring/30, which composited to about 1.2:1 on
                white — invisible, and the same defect the base focus rule in
                globals.css exists to fix. */}
            <div className="hidden h-8 w-[200px] items-center gap-2 rounded-md border border-input px-2.5 shadow-xs transition-[color,box-shadow] focus-within:border-[var(--focus-ring)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus-ring)] md:flex lg:w-[300px]">
              <HugeiconsIcon icon={Search01Icon} size={16} className="shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                aria-label="Search (not yet wired up)"
                className="w-full min-w-0 bg-transparent text-xs/relaxed text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* 8px between controls, matching the Figma header cluster's
              gap-[8px] (node 4261:2070). */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Ask AI is a placeholder with no implementation behind it, so
                it uses aria-disabled rather than `disabled`: a truly disabled
                button leaves the tab order, which would make its own
                "coming soon" name unreachable, and buttonVariants'
                disabled:pointer-events-none would suppress the tooltip too.
                This way it still reads as unavailable but can be focused and
                announced. */}
            <Button
              variant="outline"
              size="lg"
              aria-disabled="true"
              onClick={(e) => e.preventDefault()}
              title="Ask AI — coming soon"
              className="hidden opacity-60 sm:inline-flex"
            >
              <HugeiconsIcon icon={AiMagicIcon} size={16} />
              Ask AI
              <span className="sr-only">(coming soon)</span>
            </Button>

            <Button asChild variant="outline" size="icon-lg" className="relative">
              <Link
                href="/portal/notifications"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
              >
                <HugeiconsIcon icon={BellIcon} size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="lg" aria-label="Account menu" className="gap-1.5 px-1.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground">
                    {(name || "?").trim().charAt(0).toUpperCase()}
                  </span>
                  <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
                </Button>
              </DropdownMenuTrigger>

              {/* Account menu — geometry lifted from Cal.com's user dropdown
                  (app.cal.com, Aug 2026), measured off the live DOM rather
                  than eyeballed: 4px surface padding, 10px surface radius,
                  28px rows at 4px/8px padding with a 6px radius, 16px icons,
                  8px icon-to-label, and NO gap between rows — adjacent items
                  touch, and grouping is done purely with separators
                  (1px, 4px/8px margin). That last detail is what makes the
                  menu read as compact: the previous version had a 4px gap on
                  every row, which is why it felt loose at 260px wide.

                  Colours and radii still come from the portal tokens, so this
                  themes with everything else. The `portal` class comes from
                  DropdownMenuContent itself — see components/ui/dropdown-menu.tsx.

                  Groups, in Cal.com's order: [your pages] / [system] / [sign out].
                  Items are role-filtered and every href resolves to a page that
                  exists today — no placeholder rows. */}
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-[200px] max-w-[calc(100vw-2rem)] rounded-[10px] p-1 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.05),0px_4px_6px_-4px_rgba(0,0,0,0.05)]"
              >
                {/* Cal.com shows the signed-in name as a plain muted label —
                    no avatar, no email. The role badge moved out with the
                    avatar block; role is already obvious from the sidebar. */}
                <div className="truncate px-2 py-1 text-xs text-muted-foreground" title={email || name}>
                  {name}
                </div>

                {accountItems.length > 0 && (
                  <>
                    <DropdownMenuSeparator className="mx-2 my-1" />
                    {accountItems.map((item) => (
                      <DropdownMenuItem
                        key={item.href}
                        asChild
                        className="h-7 gap-2 rounded-md px-2 py-1 text-sm font-normal"
                      >
                        <Link href={item.href}>
                          <HugeiconsIcon icon={item.icon} size={16} className="shrink-0" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                <DropdownMenuSeparator className="mx-2 my-1" />

                <DropdownMenuItem
                  asChild
                  className="h-7 gap-2 rounded-md px-2 py-1 text-sm font-normal"
                >
                  <Link href="/portal/notifications">
                    <HugeiconsIcon icon={BellIcon} size={16} className="shrink-0" />
                    Notifications
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="mx-2 my-1" />

                <DropdownMenuItem
                  disabled={isPending}
                  onSelect={() => startTransition(() => signOutAction())}
                  variant="destructive"
                  className="h-7 gap-2 rounded-md px-2 py-1 text-sm font-normal transition-colors"
                >
                  <HugeiconsIcon icon={Logout03Icon} size={16} className="shrink-0" />
                  {isPending ? "Signing out\u2026" : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="portal-main" className="min-w-0 flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
