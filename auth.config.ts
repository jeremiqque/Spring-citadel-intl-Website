import type { NextAuthConfig } from "next-auth";

// EDGE-SAFE CONFIG ONLY.
//
// middleware.ts imports this file directly, and middleware runs on the Edge
// runtime — no Node APIs, no native bindings. Prisma's query engine and
// bcrypt's native hashing both fail there with
// "PrismaClient is not configured to run in Edge Runtime" or similar.
//
// Rule for this file: no `import { prisma }`, no `import bcrypt`, no
// Credentials provider (its authorize() needs both). Those live in auth.ts,
// which this file's config is merged into for the Node.js route handler and
// Server Actions. providers stays empty here on purpose — NextAuth can check
// session validity in middleware without needing the provider list at all.
export default {
  pages: {
    signIn: "/portal/login",
  },
  providers: [],
  callbacks: {
    // This callback IS the middleware gate — in Auth.js v5 there is no
    // separate logic layer in middleware.ts beyond wrapping this config; see
    // middleware.ts for the two-line wrapper. Runs on every request the
    // matcher there selects.
    //
    // Five rules, in the order they must be checked:
    //   1. /portal/login and /portal/first-login are reachable while
    //      logged out.
    //   2. Everything else under /portal/* requires a session.
    //   3. mustChangePassword forces a redirect to /portal/first-login
    //      before anything else — this is what makes handing out a
    //      temporary password on paper safe (see
    //      User.mustChangePassword in prisma/schema.prisma).
    //   4. Wrong role for a role-scoped section redirects to that user's
    //      own dashboard — never a dead-end 403.
    //   5. A logged-in user landing on /portal/login is sent onward too,
    //      rather than being shown the login form again.
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Rule 5. Checked first and only for /login: an authenticated user
      // has nothing to do there. Route by mustChangePassword first, since
      // that overrides even a valid session's normal destination.
      if (pathname === "/portal/login" && isLoggedIn) {
        if (auth.user.mustChangePassword) {
          return Response.redirect(new URL("/portal/first-login", request.url));
        }
        return Response.redirect(
          new URL(`/portal/${auth.user.role.toLowerCase()}`, request.url)
        );
      }

      // Rule 1. /portal/first-login is intentionally public AT THE
      // MIDDLEWARE LAYER — it does not require mustChangePassword to be
      // true, and does not require a session, so this callback alone lets
      // an anonymous request reach the page. That is fine only because the
      // Server Action behind the form independently calls auth() and
      // rejects any submission without a valid session — see
      // app/portal/first-login/page.tsx. Middleware being permissive here
      // is not the security boundary; the action is.
      if (pathname === "/portal/login" || pathname === "/portal/first-login") {
        return true;
      }

      // Rule 2.
      if (!isLoggedIn) {
        return false; // NextAuth redirects to `pages.signIn` automatically.
      }

      // Rule 3.
      if (auth.user.mustChangePassword && pathname !== "/portal/first-login") {
        return Response.redirect(new URL("/portal/first-login", request.url));
      }

      // Rule 4.
      const role = auth.user.role;
      if (pathname.startsWith("/portal/admin") && role !== "ADMIN") {
        return Response.redirect(new URL(`/portal/${role.toLowerCase()}`, request.url));
      }
      if (pathname.startsWith("/portal/teacher") && role !== "TEACHER") {
        return Response.redirect(new URL(`/portal/${role.toLowerCase()}`, request.url));
      }
      if (pathname.startsWith("/portal/student") && role !== "STUDENT") {
        return Response.redirect(new URL(`/portal/${role.toLowerCase()}`, request.url));
      }

      return true;
    },

    // Pure token/session shaping — no Prisma, no bcrypt — so it belongs
    // here, not in auth.ts. This is what makes `auth.user.role` and
    // `auth.user.mustChangePassword` exist at all inside authorized() above:
    // middleware only ever loads THIS file, never auth.ts, so if these two
    // callbacks lived there instead, middleware's `auth` object would carry
    // none of Auth.js's default fields (name/email/image) plus none of our
    // custom ones either — every `role`/`mustChangePassword` read here would
    // be undefined. (That was the bug: they were defined only in auth.ts.)
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
        token.tokenVersion = user.tokenVersion;
      }
      // Bug fix: firstLoginAction updates User.mustChangePassword in the DB,
      // but the JWT is only populated from `user` at sign-in — without this,
      // the cookie keeps saying mustChangePassword: true until the next full
      // login, and middleware's authorized() (rule 3) bounces every request
      // straight back to /portal/first-login forever, even after a
      // successful save. `unstable_update()` in firstLoginAction triggers
      // this branch to patch the live token instead of waiting for re-login.
      if (trigger === "update" && session?.user?.mustChangePassword !== undefined) {
        token.mustChangePassword = session.user.mustChangePassword;
      }
      // Same mechanism for tokenVersion: a user changing their own password
      // increments the row, and without patching the live token here we
      // would immediately invalidate the very session that just changed it.
      if (trigger === "update" && session?.user?.tokenVersion !== undefined) {
        token.tokenVersion = session.user.tokenVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.mustChangePassword = token.mustChangePassword;
        session.user.tokenVersion = token.tokenVersion ?? 0;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
