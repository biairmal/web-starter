import { signOutRoute } from "@/lib/bff/sign-out";

// POST /api/auth/logout (TRD 7.2, FE-22): sign out of this device.
export const POST = signOutRoute("/v1/auth/logout");
