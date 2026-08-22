import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import authConfig from "./auth.config";
import { prisma } from "@/lib/prisma";
import { clientIp, consumeLoginAttempt, clearLoginAttempts } from "@/lib/rate-limit";

// NODE RUNTIME ONLY.
//
// This is the only file allowed to import Prisma and bcrypt in the auth
// stack. It is loaded by the route handler (app/api/auth/[...nextauth]) and
// by Server Actions, both of which run on Node — never by middleware.ts,
// which imports auth.config.ts instead. See the comment at the top of that
// file for why the split exists.

const credentialsSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

// One login field serves three different credential shapes, because the
// school doesn't have — and isn't going to invent — email addresses for
// young students:
//   ADMIN / TEACHER  ->  Staff ID   "SCIS/2026/001"       (3 segments)
//                        or email, if they have one they actually use
//   STUDENT          ->  Admission No. "SCIS/2026/JSS3/001"  (4 segments)
// See lib/ids.ts for where these are minted; the segment counts must stay
// in sync with the formats generated there.
type Credential =
  | { kind: "email"; value: string }
  | { kind: "staffId"; value: string }
  | { kind: "admissionNo"; value: string }
  | { kind: "unrecognized" };

function identifyCredential(raw: string): Credential {
  // Upper-cased because lib/ids.ts mints these uppercase and the lookups are
  // exact matches. Credentials are handed out on paper and typed on phones
  // with autocapitalise off, so "scis/2026/jss3/001" was a guaranteed
  // failure — reported to the child as "Invalid login ID or password", which
  // blames their password for a capitalisation mismatch. Emails are lowered
  // instead, matching how they are minted at creation time.
  const trimmed = raw.trim();

  if (trimmed.includes("@")) {
    return { kind: "email", value: trimmed.toLowerCase() };
  }

  const value = trimmed.toUpperCase();

  const segments = value.split("/").filter(Boolean);
  if (segments.length === 4) {
    return { kind: "admissionNo", value };
  }
  if (segments.length === 3) {
    return { kind: "staffId", value };
  }

  return { kind: "unrecognized" };
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Admission No. / Staff ID / Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // `request` is the second argument for a reason — see the rate-limit
      // block below, which needs its headers.
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        // ── RATE LIMIT ────────────────────────────────────────────────────
        // HERE, not in signInAction, because this function is the one place
        // both entry points funnel through. The login form calls the Server
        // Action; anyone with a CSRF token can POST straight to Auth.js's own
        // /api/auth/callback/credentials route, which middleware.ts does not
        // match (`/portal/:path*`) and which never reaches that action. A
        // limit that only applies to the form applies to everyone except the
        // person it was written for.
        //
        // Before the bcrypt comparison below, so a blocked attempt never pays
        // for a hash. It still costs one indexed upsert, which is the point:
        // the counter has to be written for the limit to mean anything.
        const decision = await consumeLoginAttempt(
          clientIp(request.headers),
          parsed.data.identifier
        );
        if (!decision.allowed) return null;

        const credential = identifyCredential(parsed.data.identifier);

        // Resolve the credential to a User row. Each branch also enforces
        // the soft-delete boundary for its table: an INACTIVE student or
        // teacher must not be able to log in just because their User row
        // still exists — status lives on Student/Teacher, not User, so
        // that check has to happen here, per credential type.
        let user: {
          id: string;
          name: string;
          email: string;
          password: string;
          role: "ADMIN" | "TEACHER" | "STUDENT";
          mustChangePassword: boolean;
          tokenVersion: number;
        } | null = null;

        if (credential.kind === "email") {
          // The status gate has to apply here too. Every teacher and student
          // account is created with a DERIVABLE internal address —
          // `${staffId}@staff.springcitadel.internal` — so an ON_LEAVE
          // teacher or a withdrawn student could simply type that instead of
          // their ID and walk straight past the check the two branches below
          // perform. The login form advertises email as an accepted format,
          // so this was not obscure.
          const candidate = await prisma.user.findUnique({
            where: { email: credential.value },
            include: { teacher: true, student: true },
          });
          if (candidate) {
            const blocked =
              (candidate.teacher && candidate.teacher.status !== "ACTIVE") ||
              (candidate.student && candidate.student.status === "INACTIVE");
            if (!blocked) user = candidate;
          }
        } else if (credential.kind === "staffId") {
          const teacher = await prisma.teacher.findUnique({
            where: { staffId: credential.value },
            include: { user: true },
          });
          // Only ACTIVE — not just "not INACTIVE" — blocks ON_LEAVE too.
          // Package 4's "mark on leave" requirement is specifically that
          // login is disabled while on leave, not just that the account is
          // preserved; INACTIVE alone would have let an on-leave teacher
          // keep signing in.
          if (teacher && teacher.status === "ACTIVE") {
            user = teacher.user;
          }
        } else if (credential.kind === "admissionNo") {
          const student = await prisma.student.findUnique({
            where: { admissionNo: credential.value },
            include: { user: true },
          });
          if (student && student.status !== "INACTIVE") {
            user = student.user;
          }
        }
        // "unrecognized" falls through with user still null.

        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        // Only the identifier's counter, and only on a real success — so a
        // student who fat-fingered their password five times is not still
        // carrying those five against them tomorrow. The IP counter is
        // deliberately left to lapse on its own; see lib/rate-limit.ts.
        await clearLoginAttempts(parsed.data.identifier);

        // Everything returned here lands in the `user` param of the jwt()
        // callback below, once, on the request that signs in.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  // No callbacks key here on purpose: jwt() and session() moved to
  // auth.config.ts (they're pure token/session shaping, no Prisma/bcrypt,
  // and middleware needs them too — see the comment there for why leaving
  // them Node-only was the bug). The `...authConfig` spread above already
  // brings in authorized() + jwt() + session() as a complete set.
});
