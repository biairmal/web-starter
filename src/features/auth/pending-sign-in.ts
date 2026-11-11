import type { TenantChoice } from "@/lib/api/types";

// A sign-in waiting for the user to pick a tenant (APP_FLOW 5.2, FE-8). The
// password lives only in this module's memory, so a reload drops it and the
// picker sends the user back to sign-in. The email and `next` are kept in
// sessionStorage for that return, never the password.

export type PendingSignIn = {
  email: string;
  password: string;
  tenants: TenantChoice["tenants"];
  next: string;
};

export type RememberedSignIn = { email: string; next: string };

const STORAGE_KEY = "web-starter.sign-in";

let pending: PendingSignIn | null = null;

export function setPendingSignIn(value: PendingSignIn): void {
  pending = value;
  rememberSignIn({ email: value.email, next: value.next });
}

export function getPendingSignIn(): PendingSignIn | null {
  return pending;
}

/** Drops the password and the remembered email, after signing in or giving up. */
export function clearPendingSignIn(): void {
  pending = null;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: nothing was stored.
  }
}

function rememberSignIn(value: RememberedSignIn): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: the user retypes the email after a reload.
  }
}

/** The email and `next` of a sign-in the picker could not finish, if any. */
export function recallSignIn(): RememberedSignIn | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "email" in value &&
      typeof value.email === "string" &&
      "next" in value &&
      typeof value.next === "string"
    ) {
      return { email: value.email, next: value.next };
    }
  } catch {
    // Unreadable: treat as nothing remembered.
  }
  return null;
}
