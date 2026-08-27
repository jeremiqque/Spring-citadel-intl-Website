import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-xs/relaxed font-medium whitespace-nowrap transition-all select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Glossy domed treatment from Figma node 4261:5629, in the school
        // blue. The gradient replaces a flat bg, so hover/active shift
        // brightness instead of swapping a background colour. The base
        // cva string already supplies transition-all and the 1px active
        // press, which is what makes it feel like a physical key.
        default:
          "btn-glossy text-primary-foreground hover:brightness-110 active:brightness-95",
        outline:
          "border-border hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        // Flat brand blue, for the auth screens. The login and first-login
        // pages were each hand-rolling a primary button with bg-[#274ac2],
        // a custom height and a custom radius — and on login those classes
        // were DEAD: variant="default" paints .btn-glossy as a
        // background-IMAGE, which covers any background-color set beneath
        // it, so the flat colour never rendered. This is the variant those
        // two pages actually wanted.
        brand:
          "bg-brand text-white shadow-[0_1px_2px_rgba(39,74,194,.28),0_8px_20px_-8px_rgba(39,74,194,.55)] hover:bg-brand-strong",
        // text-brand, not text-primary: --primary is near-black, so a link
        // button rendered black while every other link in the portal is blue.
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default:
          // Roomier than the old h-7/px-2: the portal's buttons read as
          // cramped next to the marketing site's pill CTAs once those got
          // fixed, so every size tier below picked up more height and
          // horizontal breathing room to match.
          "h-9 gap-1.5 px-4 text-xs/relaxed has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-6 gap-1 rounded-full px-2.5 text-[0.625rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-2.5",
        sm: "h-7 gap-1.5 px-3 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-10 gap-2 px-5 text-sm has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5 [&_svg:not([class*='size-'])]:size-4",
        // h-9 to match Input/SelectTrigger, which are also h-9 and don't
        // have their own size ladder. Every form row that mixes a Button
        // with Inputs/selects (the admin filter rows, in particular) was
        // previously reaching for one-off className height overrides
        // (h-9, h-[60px]) because nothing in this ladder lined up with
        // them — this is that missing rung, not a one-off.
        field:
          "h-9 gap-1.5 px-3 text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-4",
        // The auth screens' CTA rung. Login shipped h-[52px] and
        // first-login h-[60px] — two answers to one question, seven pixels
        // and a radius apart, on consecutive screens of the same flow.
        auth: "h-[52px] w-full gap-2 px-4 rounded-full text-[length:var(--text-base)] font-medium [&_svg:not([class*='size-'])]:size-4",
        icon: "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-xs": "size-6 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-10 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Spinner() {
  return (
    <svg
      className="animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      data-icon="inline-start"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  type,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /**
     * Shows a spinner, disables the button and sets aria-busy.
     *
     * Every async button in the app was doing this by hand as a label swap —
     * `{isPending ? "Saving…" : "Save"}` — fourteen times, with no spinner,
     * no aria-busy, and (because "Save" and "Saving…" are different widths)
     * a button that RESIZED mid-action. Keep the label steady and let the
     * spinner carry the state.
     */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  // NO `outline-none` HERE. app/globals.css installs the portal's only
  // real focus indicator on `.portal :focus-visible` in @layer base;
  // this utility sits in @layer utilities, and cascade layers ignore
  // specificity across layers, so it won a fight the base rule was
  // written to win. What was left is ring-ring/30 — about 1.2:1 on
  // white, i.e. invisible — which is the exact failure the comment
  // above that base rule already condemns. Keyboard focus is now
  // visible on buttons, inputs and selects again.
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      // Default to type="button", not the HTML default of type="submit".
      // A Button with no explicit type, dropped inside a <form> (a dialog's
      // Cancel button, a dropdown trigger, a row action), otherwise submits
      // that form on click/Enter — every real submit button in this app
      // (the Apply buttons, "Submit result") already sets type="submit"
      // explicitly, so this only removes a footgun, it doesn't change any
      // intended submit behaviour. Skipped when asChild, since the
      // rendered element (e.g. a Link) may not accept a type attribute.
      {...(!asChild ? { type: type ?? "button" } : {})}
      className={cn(buttonVariants({ variant, size, className }))}
      // aria-busy tells a screen reader the control is working; disabled
      // stops a double submit. asChild renders someone else's element (a
      // Link), which can't be disabled, so loading is a no-op there.
      {...(loading && !asChild ? { "aria-busy": true, disabled: true } : {})}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <Spinner />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
