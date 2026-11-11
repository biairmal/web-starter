/**
 * A full page load, not a client-side transition: the next page renders on
 * the server with the cookies a BFF route just set, and nothing from the
 * previous screen stays in memory.
 */
export function hardNavigate(url: string): void {
  window.location.assign(url);
}
