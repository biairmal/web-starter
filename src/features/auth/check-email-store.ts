// The address a sign-up just used, for the check-email screen to echo
// (DESIGN_BRIEF 7.2). It stays in this tab's sessionStorage, not the URL, so
// it never reaches a server log.

const STORAGE_KEY = "web-starter.check-email";

export function rememberSignUpEmail(email: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, email);
  } catch {
    // Storage blocked: the screen shows the generic sentence.
  }
}

export function recallSignUpEmail(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
