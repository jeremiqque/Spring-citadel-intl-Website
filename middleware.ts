import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Edge-safe by construction: imports only auth.config.ts, never auth.ts (which
// pulls in Prisma + bcrypt — neither of which can run in the Edge runtime).
// The authorized() callback inside authConfig IS the gate; there is no
// separate logic layer here.
const nextAuth = NextAuth(authConfig);

export const middleware = nextAuth.auth;

export const config = {
  // Scope middleware to the portal only — the marketing site never enters
  // the auth pipeline.
  matcher: ["/portal/:path*"],
};
