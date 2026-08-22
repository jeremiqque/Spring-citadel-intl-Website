import { handlers } from "@/auth";

// NextAuth's route handler covers every auth endpoint under this path —
// /api/auth/session, /api/auth/csrf, /api/auth/signin, /api/auth/signout,
// and the credentials callback itself. Nothing else needs to be added here.
export const { GET, POST } = handlers;
