// The collapsed-sidebar choice, kept in a cookie so the server renders the
// right width on the first paint (no layout shift). Not a secret: it holds
// only "collapsed" or "expanded".
export const SIDEBAR_COOKIE = "sidebar_state";

export function isSidebarCollapsed(value: string | undefined): boolean {
  return value === "collapsed";
}
