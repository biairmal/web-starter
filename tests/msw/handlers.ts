import { http, HttpResponse } from "msw";
import type { AuthConfig, Me } from "@/lib/api/types";

// Fixtures for component and unit tests. They are exact values, unlike the
// dynamic Prism mock. Routes match identity's /v1 paths (BE TRD 9.4, 9.5).

export const authConfigFixture: AuthConfig = {
  providers: { password: true, google: false },
  registration: true,
  tenancy: "single",
};

export const meFixture: Me = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "user@example.com",
  display_name: "Test User",
  email_verified: true,
  is_super_admin: false,
  tenant: {
    id: "00000000-0000-4000-8000-000000000002",
    slug: "default",
    name: "Default",
  },
  roles: ["member"],
  permissions: [],
  providers: { password: true, google: false },
};

function envelope<T>(data: T) {
  return { timestamp: "2026-11-07T00:00:00Z", data };
}

export const handlers = [
  http.get("*/v1/auth/config", () =>
    HttpResponse.json(envelope(authConfigFixture)),
  ),
  http.get("*/v1/me", () => HttpResponse.json(envelope(meFixture))),
];
