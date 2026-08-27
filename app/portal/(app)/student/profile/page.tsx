import { redirect } from "next/navigation";

/**
 * Kept as a redirect, not deleted.
 *
 * This path was linked from the student sidebar and the account menu before
 * /portal/profile existed, so it is in browser histories and possibly in
 * bookmarks. Self-service account management is now one page for all three
 * roles — see app/portal/(app)/profile/page.tsx for why. A permanent
 * redirect keeps every old link working instead of retiring them into a 404.
 */
export default function StudentProfileRedirect() {
  redirect("/portal/profile");
}
