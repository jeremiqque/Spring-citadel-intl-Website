import { randomInt } from "crypto";

/**
 * Temporary password for a newly created or reset account.
 *
 * These are handed over on paper (see User.mustChangePassword), so a random
 * hex blob is secure but painful to transcribe onto an admission letter
 * without mixing up 0/O or 1/l. The readable format stays; the entropy does
 * not.
 *
 * WHY THIS CHANGED — the previous version was `Word + 4 digits + "!"` drawn
 * from a 14-word list: 14 x 10,000 = 140,000 possibilities, about 17 bits.
 * The capitalisation and trailing "!" were constant and contributed nothing.
 * That is trivially brute-forceable, and it compounded with two other facts:
 * admission numbers are sequential and therefore enumerable, and an account
 * still holding a temporary password announces itself by redirecting to
 * /portal/first-login. The rate limiter is the only brake, and it does not
 * survive a serverless cold start.
 *
 * Three words from this 64-word list plus 3 digits is
 *   64^3 * 1000 = 262,144,000   (~2^28)
 * — about 1,900x the old keyspace, still readable aloud over a phone, and
 * still clears the 10-character minimum on the first-login form.
 *
 * The list avoids words under four letters and near-homophones, so a
 * password read out over a bad phone line survives the trip.
 */
const WORDS = [
  "Falcon", "Harbor", "Meadow", "Cobalt", "Lantern", "Orchid", "Summit", "Pepper",
  "Marble", "Willow", "Comet", "Anchor", "Copper", "Cedar", "Garnet", "Juniper",
  "Kestrel", "Lagoon", "Maple", "Nectar", "Onyx", "Prairie", "Quartz", "Ridge",
  "Saffron", "Timber", "Umber", "Velvet", "Walnut", "Yarrow", "Zephyr", "Amber",
  "Basalt", "Canyon", "Dune", "Ember", "Fjord", "Granite", "Heather", "Indigo",
  "Jasper", "Kelp", "Larch", "Mica", "Nutmeg", "Opal", "Pumice", "Quill",
  "Rowan", "Slate", "Thistle", "Ursa", "Vellum", "Wicker", "Xenon", "Yonder",
  "Zenith", "Alder", "Birch", "Cypress", "Delta", "Sable", "Fern", "Grove",
];

export function generateTempPassword(): string {
  // randomInt is crypto-backed and rejection-samples, so there is no modulo
  // bias — worth keeping over Math.random for anything guarding an account.
  const words = Array.from({ length: 3 }, () => WORDS[randomInt(WORDS.length)]);
  const digits = String(randomInt(0, 1000)).padStart(3, "0");
  return `${words.join("-")}-${digits}`;
}
