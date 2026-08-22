import type { DefaultSession } from "next-auth";

// Augments Auth.js's built-in types with the fields auth.ts's jwt() and
// session() callbacks actually put on the token and session.
//
// GOTCHA (cost real time to find): next-auth/jwt is a re-export barrel
// (`export * from "@auth/core/jwt"`) — the JWT interface is actually
// *declared* in @auth/core/jwt. TypeScript's `declare module` augmentation
// only merges at the module where an interface is declared, not at a module
// that merely re-exports it. Augmenting "next-auth/jwt" alone compiles
// without error but silently does nothing: JWT extends
// Record<string, unknown>, so every field you "add" quietly resolves to
// `unknown` instead of failing loudly. Augment @auth/core/jwt directly.

type Role = "ADMIN" | "TEACHER" | "STUDENT";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      mustChangePassword: boolean;
      // Bumped on every password change and deactivation; compared against
      // the User row on each authenticated render so a stolen or stale
      // cookie stops working. See app/portal/(app)/layout.tsx.
      tokenVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    // Base User.id is optional (populated by adapters); our Credentials
    // authorize() always returns it explicitly, so it's required here.
    id: string;
    role: Role;
    mustChangePassword: boolean;
    tokenVersion: number;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    role: Role;
    mustChangePassword: boolean;
    tokenVersion: number;
  }
}
