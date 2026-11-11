// Accounts the mock identity (tests/e2e/mock-identity.mts) signs in. Every
// account uses MOCK_PASSWORD; any other password is INVALID_CREDENTIALS.

export const MOCK_PASSWORD = "correct-horse-battery";

export type MockUser = {
  email: string;
  name: string;
  /** Answers ACCOUNT_LOCKED with 14 minutes to wait. */
  locked?: boolean;
  /** Belongs to several tenants: asks for one when none is named. */
  multi?: boolean;
  /** Signs in with a restricted token (forced password change). */
  mustChange?: boolean;
};

export const MOCK_USERS: readonly MockUser[] = [
  { email: "dina@example.test", name: "Dina Pratama" },
  { email: "locked@example.test", name: "Locked User", locked: true },
  { email: "multi@example.test", name: "Multi Tenant", multi: true },
  { email: "change@example.test", name: "Change Me", mustChange: true },
];

export const MOCK_TENANTS = [
  { id: "00000000-0000-4000-8000-0000000000a1", slug: "acme", name: "Acme" },
  {
    id: "00000000-0000-4000-8000-0000000000a2",
    slug: "globex",
    name: "Globex",
  },
];
