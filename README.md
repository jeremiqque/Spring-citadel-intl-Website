# Spring Citadel International School

Marketing website for Spring Citadel International School — a multi-page Next.js site built from a Figma design, with GSAP animation scaffolding throughout.

## Tech stack

- **Next.js** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **GSAP** + `@gsap/react` (`useGSAP`) for animations
- **react-icons** for iconography
- **Aeonik** (local font via `next/font/local`)

## Pages

| Route        | Description                                                            |
| ------------ | ---------------------------------------------------------------------- |
| `/`          | Home — hero, mission band, why choose us, about, academics, gallery, CTA |
| `/about`     | About — header, hero stats, mission & vision, core values, stakeholders |
| `/academics` | Academics — programmes intro, class cards, "coming soon"               |
| `/gallery`   | Gallery — overlay hero, masonry grid, contact form                     |
| `/contact`   | Contact — hero, contact form, map, programmes band, testimonials       |
| `*`          | Custom 404 (`not-found.tsx`)                                           |

## Getting started

```bash
# install dependencies
npm install

# run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

```bash
# production build
npm run build
npm run start
```

## Project structure

```
app/
  layout.tsx              # root layout, Aeonik font, metadata
  globals.css             # design tokens + Tailwind theme
  page.tsx                # home page
  not-found.tsx           # 404 page
  about/ academics/ gallery/ contact/   # page routes
  components/
    Navbar.tsx  Footer.tsx  MarqueeCTA.tsx  ui.tsx
    about/  academics/  gallery/  contact/   # section components
  fonts/                  # Aeonik .ttf files
lib/
  gsap.ts                 # registers ScrollTrigger + useGSAP
public/
  crest.png  icon.png     # school crest / favicon
```

## Design system

Defined in `app/globals.css` (`@theme`):

- **Background:** `#FFFFFF`
- **Text:** `#000000`
- **Blue:** `#274AC2` (primary / footer)
- **Navy:** `#14225C`
- **Red:** `#E23B3B`
- **Font:** Aeonik (`--font-aeonik`)
- **Side padding:** 60px (desktop) · **Section spacing:** 120px

## Animations

GSAP is registered in `lib/gsap.ts` (guarded by `typeof window`). Every section
component is scoped with `useGSAP(() => {...}, { scope: ref })`. The footer
marquee (`MarqueeCTA`) runs an infinite `xPercent` loop.

## Notes

- Image placeholders are styled blocks ready to be swapped for real photography.
- The contact form is front-end only — wire it to an email service / backend before launch.
