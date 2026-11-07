// Theme preference and the resolved theme written to <html data-theme>.
// DESIGN_BRIEF 10.2 selects colours with [data-theme="dark"], so the attribute
// (not a class) carries the theme.

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** Maps a preference and the OS setting to the theme to show. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return preference;
}

/**
 * Inline script for <head>, so the first paint already has the right theme.
 * Reads the stored preference, falls back to the brand default, and sets
 * data-theme. Any failure (storage blocked) leaves the light theme.
 */
export function themeInitScript(defaultTheme: ThemePreference): string {
  return `(function(){try{var p=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});if(p!=="light"&&p!=="dark"&&p!=="system"){p=${JSON.stringify(defaultTheme)};}var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.setAttribute("data-theme",p==="dark"||(p==="system"&&dark)?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
}
