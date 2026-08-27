import { cn } from "@/lib/utils"

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-xl",
  xl: "size-24 text-3xl",
} as const

/**
 * A person's picture, or their initial when they have none.
 *
 * ── WHY THE FALLBACK IS THE INITIAL AND NOT A GENERIC SILHOUETTE ───────────
 * Because in a list, a column of identical grey person-icons carries no
 * information at all, while a column of letters is scannable. The initial is
 * also what this portal already showed in the header before pictures
 * existed, so an account with no photo looks unchanged rather than newly
 * broken.
 *
 * ── WHY A PLAIN <img> AND NOT next/image ───────────────────────────────────
 * next/image proxies through the Next optimizer, which would fetch this
 * private, authenticated URL from the server side without the user's cookie
 * and cache the result in a SHARED optimizer cache. A cache of children's
 * photographs keyed where one user's request can serve another's is exactly
 * the class of bug this app's caching headers exist to prevent. The images
 * are already 256px and pre-compressed, so there is nothing for the
 * optimizer to do anyway.
 */
export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  /** From avatarUrl() in lib/avatar.ts — null when the user has no photo. */
  src: string | null
  name: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase()

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-tint font-semibold text-brand select-none",
        SIZES[size],
        className
      )}
      // The name is on the wrapper, not the img, so the fallback letter is
      // announced as the person too — otherwise a screen reader hears "N"
      // for every account without a photo.
      role="img"
      aria-label={name}
    >
      {src ? (
        <img
          src={src}
          alt=""
          // Decorative at the img level: the wrapper above already carries
          // the accessible name, and a duplicate alt would announce the
          // person twice.
          aria-hidden
          // Square source, square box — object-cover is what stops a
          // non-square edge case from distorting a face rather than cropping
          // it. `loading="lazy"` matters on the admin lists, which can render
          // a page of these at once.
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        initial
      )}
    </span>
  )
}
