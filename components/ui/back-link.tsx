import Link from "next/link";

// A dead-end drill-down page (a detail view, an "edit" form, a "new" form
// reached by clicking into a list) used to offer no way out except the
// browser's back button or a sidebar item — which jumps to the top of that
// section and drops any search/filter/page the list had. This is the one
// link every such page renders above its heading so there's always an
// explicit, in-app way back to where the user came from.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M19 12H5M11 18l-6-6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </Link>
  );
}
