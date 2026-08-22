import { redirect } from "next/navigation";
import { auth } from "@/auth";

// The old "Coming Soon" marketing placeholder lived here. Now that login
// exists, this route's only job is to send everyone to where they actually
// belong — it should never render anything itself.
export default async function PortalIndexPage() {
  const session = await auth();

  // Defense in depth: middleware already requires a session for anything
  // under /portal/*, so reaching this unauthenticated shouldn't happen in
  // practice. Keeping the check here means this page is still correct if
  // it's ever reached standalone (e.g. a future server-to-server request).
  if (!session?.user) {
    redirect("/portal/login");
  }
  if (session.user.mustChangePassword) {
    redirect("/portal/first-login");
  }

  redirect(`/portal/${session.user.role.toLowerCase()}`);
}
