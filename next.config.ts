import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * This portal holds minors' academic records, so the defaults matter more
 * than they would on a marketing site. Previously this file set only
 * reactStrictMode, which meant no CSP, no HSTS and no framing protection —
 * the portal could be embedded in an attacker's page and clickjacked.
 *
 * The CSP is deliberately conservative rather than minimal:
 *   - 'unsafe-inline' on script-src is required by Next.js's inline bootstrap
 *     and by next/font's style injection. Removing it needs nonce plumbing
 *     through the middleware; worth doing later, not a blocker now.
 *   - connect-src allows 'self' only. If an analytics or error-tracking
 *     service is added later (see the audit — there is none today), its
 *     origin has to be listed here or the reports will be blocked silently.
 *   - frame-ancestors 'none' is the clickjacking fix and has no legitimate
 *     counterpart in this app: nothing here is meant to be embedded.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Don't advertise the framework version to anyone scanning for known CVEs.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          // 2 years, preload-eligible. Vercel terminates TLS, so this is safe
          // to send on every response.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No page in this app uses a camera, microphone or location.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
      {
        // The portal is per-user and must never be cached by a shared proxy —
        // one student's dashboard reaching another student is the worst
        // possible caching bug in this product.
        source: "/portal/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
