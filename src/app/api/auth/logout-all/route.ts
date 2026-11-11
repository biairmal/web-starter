import { signOutRoute } from "@/lib/bff/sign-out";

// POST /api/auth/logout-all (TRD 7.2, FE-22): sign out of every device.
export const POST = signOutRoute("/v1/auth/logout-all");
