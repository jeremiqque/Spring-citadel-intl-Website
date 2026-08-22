/**
 * One place for the bcrypt work factor.
 *
 * Cost 10 — the previous value, repeated in six files — is the 2010-era
 * default and takes roughly 60ms on modern hardware. Against a leaked hash
 * dump that is cheap enough to be worth an attacker's time, and it compounded
 * with a temporary-password keyspace of ~17 bits (see lib/temp-password.ts,
 * now ~28).
 *
 * 12 is ~4x the work of 10. Note bcryptjs is the pure-JS implementation,
 * roughly 3-5x slower than native bcrypt, so expect ~250-400ms per hash on a
 * serverless instance — and remember that is synchronous CPU which blocks the
 * event loop for every other request on that instance. It is paid on login,
 * enrolment and password reset only, never on a page render.
 *
 * If login latency becomes a problem the fix is to move to native `bcrypt`
 * or argon2id, NOT to lower this number.
 */
export const BCRYPT_COST = 12;
