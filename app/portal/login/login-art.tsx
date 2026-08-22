/**
 * Login illustration — the right-hand panel of /portal/login.
 *
 * Pure SVG, no image asset: a few KB, sharp at any density, and it inherits
 * the page's own blue rather than baking a colour into a PNG that would drift
 * the day --color-blue changes.
 *
 * The vocabulary is taken from the school crest (public/crest.png) rather than
 * invented: mortarboard, rolled diploma, stacked books, and the crest's red as
 * the single accent against the school blue. That is what keeps it reading as
 * Spring Citadel instead of as stock artwork.
 *
 * Kept in its own file purely for readability — page.tsx is the auth flow, and
 * ~80 lines of path data in the middle of it would bury the part that matters.
 */
export function LoginArt() {
  return (
    <svg
      viewBox="0 0 640 780"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="scis-plinthA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
          <stop offset="1" stopColor="#c7d4ff" stopOpacity=".55" />
        </linearGradient>
        <linearGradient id="scis-plinthB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".70" />
          <stop offset="1" stopColor="#b8c8fb" stopOpacity=".32" />
        </linearGradient>
        <linearGradient id="scis-cap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9c9ff" />
        </linearGradient>
        <linearGradient id="scis-capShade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fa6f2" />
          <stop offset="1" stopColor="#5d78dd" />
        </linearGradient>
        <linearGradient id="scis-scroll" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d3ddff" />
        </linearGradient>
        <linearGradient id="scis-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".9" />
          <stop offset=".5" stopColor="#ffffff" stopOpacity=".25" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".75" />
        </linearGradient>
        {/* The caption sits over the artwork, so it gets its own contrast floor
            rather than depending on wherever the podium lands at a given
            viewport height. */}
        <linearGradient id="scis-scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#16307f" stopOpacity="0" />
          <stop offset=".55" stopColor="#152c76" stopOpacity=".55" />
          <stop offset="1" stopColor="#132667" stopOpacity=".88" />
        </linearGradient>
        <radialGradient id="scis-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#9db6ff" stopOpacity=".55" />
          <stop offset="1" stopColor="#9db6ff" stopOpacity="0" />
        </radialGradient>
        <filter id="scis-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
      </defs>

      <circle cx="330" cy="330" r="250" fill="url(#scis-glow)" />

      {/* Faint grid — a quiet echo of the tabular content behind the login. */}
      <g stroke="#ffffff" strokeOpacity=".07">
        <path d="M0 190h640M0 300h640M0 410h640M0 520h640M0 630h640" />
        <path d="M120 0v780M250 0v780M380 0v780M510 0v780" />
      </g>

      {/* Floating accents */}
      <circle cx="128" cy="150" r="7" fill="#fff" fillOpacity=".55" />
      <circle cx="540" cy="232" r="11" fill="#fff" fillOpacity=".28" />
      <rect x="486" y="120" width="26" height="26" rx="7" fill="#fff" fillOpacity=".22" transform="rotate(22 499 133)" />
      <path d="M96 470l16 9v18l-16 9-16-9v-18z" fill="#fff" fillOpacity=".16" />

      {/* One group so the whole composition can be lifted clear of the caption
          without re-laying-out every prop. */}
      <g transform="translate(0,-96)">
        <ellipse cx="330" cy="640" rx="196" ry="30" fill="#0a1852" fillOpacity=".55" filter="url(#scis-soft)" />

        {/* Podium — three blocks, tallest centre */}
        <rect x="146" y="556" width="122" height="90" rx="12" fill="url(#scis-plinthB)" />
        <rect x="392" y="578" width="116" height="68" rx="12" fill="url(#scis-plinthB)" />
        <rect x="254" y="492" width="150" height="154" rx="14" fill="url(#scis-plinthA)" />
        <rect x="254" y="492" width="150" height="13" rx="6.5" fill="#fff" fillOpacity=".95" />

        {/* Rolled diploma, lying across the right block */}
        <g transform="rotate(-9 450 566)">
          <rect x="392" y="550" width="122" height="32" rx="16" fill="url(#scis-scroll)" />
          <rect x="440" y="550" width="15" height="32" fill="#d0212b" fillOpacity=".8" />
          <ellipse cx="392" cy="566" rx="8" ry="16" fill="#e9eeff" />
          <ellipse cx="514" cy="566" rx="8" ry="16" fill="#fff" fillOpacity=".9" />
        </g>

        {/* Stacked books, seated on the centre block */}
        <rect x="266" y="469" width="126" height="24" rx="6" fill="#fff" fillOpacity=".95" />
        <rect x="266" y="469" width="19" height="24" rx="6" fill="#d0212b" fillOpacity=".9" />
        <rect x="278" y="443" width="110" height="24" rx="6" fill="#fff" fillOpacity=".8" />
        <rect x="278" y="443" width="18" height="24" rx="6" fill="#d0212b" fillOpacity=".6" />

        <ellipse
          cx="330" cy="322" rx="158" ry="54"
          fill="none" stroke="url(#scis-ring)" strokeWidth="10"
          transform="rotate(-14 330 322)"
        />

        {/* Mortarboard */}
        <g transform="translate(330 300)">
          <path d="M-52 6h104v30a10 10 0 0 1-10 10H-42a10 10 0 0 1-10-10z" fill="url(#scis-capShade)" />
          <path d="M0-58l112 46L0 34l-112-46z" fill="url(#scis-cap)" />
          <path d="M0-58l112 46L0 34z" fill="#ffffff" fillOpacity=".55" />
          <circle cx="0" cy="-12" r="7" fill="#d0212b" />
          <path
            d="M0-12c34 10 52 22 52 42v34"
            fill="none" stroke="#d0212b" strokeOpacity=".9" strokeWidth="4" strokeLinecap="round"
          />
          <circle cx="52" cy="66" r="8" fill="#d0212b" />
        </g>
      </g>

      <rect x="0" y="470" width="640" height="310" fill="url(#scis-scrim)" />
    </svg>
  );
}
