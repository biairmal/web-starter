// Accounts the mock identity (tests/e2e/mock-identity.mts) signs in. Every
// account uses MOCK_PASSWORD; any other password is INVALID_CREDENTIALS.

export const MOCK_PASSWORD = "correct-horse-battery";

export type MockUser = {
  email: string;
  name: string;
  /** Answers ACCOUNT_LOCKED with 14 minutes to wait. */
  locked?: boolean;
  /** Answers EMAIL_NOT_VERIFIED after the right password. */
  unverified?: boolean;
  /** Belongs to several tenants: asks for one when none is named. */
  multi?: boolean;
  /** Signs in with a restricted token (forced password change). */
  mustChange?: boolean;
};

export const MOCK_USERS: readonly MockUser[] = [
  { email: "dina@example.test", name: "Dina Pratama" },
  { email: "locked@example.test", name: "Locked User", locked: true },
  { email: "new@example.test", name: "New User", unverified: true },
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

/** The one email-link token the mock identity accepts (verify, reset, invite). */
export const MOCK_GOOD_TOKEN = "good-token";

/** A password the mock identity refuses as too common (PASSWORD_POLICY). */
export const MOCK_COMMON_PASSWORD = "password1234";
