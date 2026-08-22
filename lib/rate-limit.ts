import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Login rate limiting, backed by Postgres.
 *
 * ── WHAT THIS REPLACES, AND THE BIGGER THING IT FIXES ──────────────────────
 * It replaces a `Map` in the Node process whose own comment read: "on a
 * serverless platform every instance has its own copy and a cold start wipes
 * it, so the effective ceiling is (max x number of live instances) and it
 * LOOSENS as the platform scales up under load." That is a limit that reports
 * success while doing nothing.
 *
 * The worse problem was WHERE it was called. The only call site was
 * signInAction — the Server Action behind the login form. But
 * app/api/auth/[...nextauth]/route.ts publicly mounts Auth.js's own
 * `/api/auth/callback/credentials` endpoint, and middleware.ts only matches
 * `/portal/:path*`, so that route was not gated at all. Anyone willing to
 * fetch a CSRF token could POST straight to it in a loop: every attempt ran
 * the user lookup and a full bcrypt comparison, and no counter was ever
 * touched. The limit applied to people using the login form and to nobody
 * else — which is the exact inverse of who it is for.
 *
 * So the consuming check now lives inside `authorize()` in auth.ts, which is
 * the one place BOTH paths funnel through. The login form additionally
 * *peeks* (see peekLoginAttempts) purely so it can show a useful message,
 * because Auth.js collapses every provider failure into one opaque error.
 *
 * ── THE TWO BUCKETS, AND WHY THEY ARE DIFFERENT SIZES ──────────────────────
 * Per identifier (8): the control that actually stops password guessing. It
 * cannot be evaded by spoofing a header — an attacker has to switch to a
 * different account, which is the point.
 *
 * Per IP (60): deliberately generous, because a legitimate shared connection
 * is one IP. A school computer lab, the staff room wifi, or a whole class
 * doing first-login together all arrive from a single NAT. A blunt backstop
 * against one host hammering many accounts, not the primary control.
 *
 * Only the IDENTIFIER bucket is cleared on a successful sign-in. Clearing the
 * IP bucket too — which an earlier version did — handed the backstop away:
 * an attacker could spray one password across sixty accounts from one host,
 * sign in to their own account to zero the IP counter, and repeat forever.
 * Any student or member of staff has a working credential, so that is not a
 * theoretical attacker. The IP window simply lapses on its own instead.
 *
 * ── WHY RAW SQL ────────────────────────────────────────────────────────────
 * "Increment if the window is still open, otherwise start a new one" is a
 * conditional update on the row's own current value, which Prisma's `upsert`
 * cannot express — its `update` block has no access to the existing row. The
 * portable version is read-then-write, which is exactly the race lib/ids.ts
 * exists to avoid: two concurrent attempts both read count = 7, both write 8,
 * and the ninth attempt is allowed. One INSERT ... ON CONFLICT DO UPDATE is
 * atomic under Postgres' row lock, so concurrency cannot inflate the ceiling.
 *
 * Every timestamp comes from NOW() inside the database — including the
 * "try again in N minutes" figure, which is computed in SQL rather than by
 * subtracting from the app's Date.now(). Instances with drifting clocks would
 * otherwise disagree with the database about a deadline the database owns.
 */

const WINDOW_SECONDS = 15 * 60;

const MAX_PER_IDENTIFIER = 8;
const MAX_PER_IP = 60;

export type RateLimitResult =
  | { allowed: true }
  /** Over the limit. `retryAfterMs` is measured by the database. */
  | { allowed: false; reason: "rate-limited"; retryAfterMs: number }
  /** The limiter itself could not run and refused to fail open. See below. */
  | { allowed: false; reason: "unavailable" };

const ALLOWED: RateLimitResult = { allowed: true };

type BucketRow = { count: number; retryAfterSeconds: number };

/**
 * Increment one bucket and decide. Throws on any database error; the callers
 * below classify it.
 *
 * The fixed window is the reason `resetAt` is only overwritten on the expired
 * branch. Refreshing it on every attempt turns the limit into a rolling
 * lockout an attacker can hold open indefinitely by continuing to try — which
 * punishes the real account holder, not the attacker.
 */
async function consume(key: string, max: number): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<BucketRow[]>(Prisma.sql`
    INSERT INTO "RateLimit" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, NOW() + make_interval(secs => ${WINDOW_SECONDS}::double precision), NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."resetAt" <= NOW() THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimit"."resetAt" <= NOW()
          THEN NOW() + make_interval(secs => ${WINDOW_SECONDS}::double precision)
        ELSE "RateLimit"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING
      "count",
      CEIL(EXTRACT(EPOCH FROM ("resetAt" - NOW())))::int AS "retryAfterSeconds"
  `);

  return verdict(rows[0], max);
}

/** Read a bucket without incrementing it. */
async function peek(key: string, max: number): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<BucketRow[]>(Prisma.sql`
    SELECT
      "count",
      CEIL(EXTRACT(EPOCH FROM ("resetAt" - NOW())))::int AS "retryAfterSeconds"
    FROM "RateLimit"
    WHERE "key" = ${key} AND "resetAt" > NOW()
  `);

  return verdict(rows[0], max);
}

function verdict(row: BucketRow | undefined, max: number): RateLimitResult {
  if (!row) return ALLOWED;
  if (row.count <= max) return ALLOWED;
  return {
    allowed: false,
    reason: "rate-limited",
    retryAfterMs: Math.max(0, row.retryAfterSeconds) * 1000,
  };
}

/**
 * Count this attempt and decide whether it may proceed. Call from
 * `authorize()` in auth.ts, BEFORE bcrypt, so a blocked attempt never pays
 * for a hash comparison.
 *
 * `ip` may be null — see clientIp() below. When it is, only the identifier
 * bucket applies; a null IP must never collapse into one shared bucket.
 *
 * The two buckets are two statements rather than one multi-row INSERT, on
 * purpose: a blocked identifier returns before the IP bucket is touched, so a
 * user who has locked their own account does not go on burning the allowance
 * shared with everyone else in their computer lab.
 */
export async function consumeLoginAttempt(
  ip: string | null,
  identifier: string
): Promise<RateLimitResult> {
  try {
    const byIdentifier = await consume(identifierKey(identifier), MAX_PER_IDENTIFIER);
    if (!byIdentifier.allowed) return byIdentifier;

    if (ip === null) return ALLOWED;
    return await consume(ipKey(ip), MAX_PER_IP);
  } catch (err) {
    return onLimiterError(err, "consume");
  }
}

/**
 * Non-incrementing check, for the login form only.
 *
 * Auth.js collapses every provider failure into one opaque AuthError, so the
 * Server Action cannot tell "wrong password" from "rate limited" and would
 * have to tell a locked-out student their password was wrong. This peeks so
 * it can say something true and actionable. It must NOT increment — the
 * consuming check in authorize() counts the attempt, and doing both would
 * halve every allowance.
 */
export async function peekLoginAttempts(
  ip: string | null,
  identifier: string
): Promise<RateLimitResult> {
  try {
    const byIdentifier = await peek(identifierKey(identifier), MAX_PER_IDENTIFIER);
    if (!byIdentifier.allowed) return byIdentifier;

    if (ip === null) return ALLOWED;
    return await peek(ipKey(ip), MAX_PER_IP);
  } catch (err) {
    return onLimiterError(err, "peek");
  }
}

/**
 * Clear the identifier's counter after a successful sign-in, and sweep
 * expired rows while we are here.
 *
 * NOT the IP counter — see the header. The sweep is bounded by the index on
 * `resetAt` and normally deletes nothing or a handful of rows; it rides on
 * successful logins because this deployment has no scheduler, and the table
 * only grows when people are logging in at all.
 */
export async function clearLoginAttempts(identifier: string): Promise<void> {
  try {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "RateLimit"
      WHERE "key" = ${identifierKey(identifier)}
         OR "resetAt" <= NOW()
    `);
  } catch (err) {
    // Never let bookkeeping fail a sign-in that has already succeeded. The
    // worst case is a counter that lapses on its own fifteen minutes later.
    console.error("[rate-limit] clear failed:", err);
  }
}

/**
 * Extract the client IP, or null if this deployment does not give us one.
 *
 * Returning null rather than a placeholder is the whole point. An earlier
 * version fell back to the string "unknown", which is a single shared bucket:
 * behind a proxy that sets X-Real-IP but not X-Forwarded-For, or on a direct
 * Node deployment, EVERY user in the school keyed to `ip:unknown` and the
 * 61st login attempt school-wide in a quarter-hour was refused — the
 * shared-NAT lockout the design set out to avoid, in its worst possible form.
 *
 * X-Forwarded-For is client-supplied unless the edge proxy overwrites it,
 * which is why it can never be the primary key: an attacker rotating the
 * header buys themselves unlimited IP allowance. That is exactly what the
 * per-identifier bucket is for.
 */
export function clientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) return forwardedFor;

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return null;
}

/**
 * FAILS OPEN ON AN OUTAGE, CLOSED ON A MISSING TABLE.
 *
 * The distinction matters and the previous blanket fail-open got it wrong.
 *
 * An outage — connection refused, pool timeout, Neon cold-starting — fails
 * open, because the very next thing a permitted attempt does is look the user
 * up in the same database and compare a hash. A database that cannot serve
 * this query cannot serve that one either, so failing open admits nobody; it
 * just declines to turn an outage into "nobody at this school can sign in,
 * and the error blames their password."
 *
 * A MISSING TABLE is different, and is the case the blanket rule swallowed.
 * Ship this code before running `prisma migrate deploy` and every query here
 * throws `relation "RateLimit" does not exist` — while User and Student are
 * untouched, so logins work perfectly and the rate limit is silently, totally
 * off, evidenced by nothing but a console line nobody reads. That is a
 * deploy-ordering mistake that must be loud, so it fails closed: sign-in
 * stops until the migration is applied, which is a five-minute outage instead
 * of an unbounded silent one.
 */
function onLimiterError(err: unknown, phase: string): RateLimitResult {
  if (isMissingTable(err)) {
    console.error(
      `[rate-limit] the RateLimit table is missing (${phase}). ` +
        "Run `prisma migrate deploy`. Sign-in is blocked until it exists, " +
        "deliberately — see lib/rate-limit.ts."
    );
    return { allowed: false, reason: "unavailable" };
  }

  console.error(`[rate-limit] ${phase} failed, allowing the attempt:`, err);
  return ALLOWED;
}

/**
 * Postgres reports an unknown relation as SQLSTATE 42P01. Prisma surfaces raw
 * query failures as P2010 with the driver's code in `meta`, but the exact
 * shape has moved between versions, so this checks the code and the message
 * rather than trusting one field.
 */
function isMissingTable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const meta = (err as { meta?: { code?: unknown } }).meta;
  if (meta && typeof meta.code === "string" && meta.code === "42P01") return true;

  const message = (err as { message?: unknown }).message;
  if (typeof message !== "string") return false;
  return message.includes("42P01") || /relation .*RateLimit.* does not exist/i.test(message);
}

function identifierKey(identifier: string) {
  return `id:${identifier.trim().toUpperCase()}`;
}

function ipKey(ip: string) {
  return `ip:${ip}`;
}
