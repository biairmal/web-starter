"use client";

import { useEffect, useState } from "react";
import { brand } from "@/config/brand";
import {
  type ThemePreference,
  applyThemePreference,
  readThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: readonly [ThemePreference, string][] = [
  ["light", "Light"],
  ["dark", "Dark"],
  ["system", "System"],
];

/** Light, dark or system, stored like the user menu's choice. */
export function ThemeSwitch() {
  const [theme, setTheme] = useState<ThemePreference>(brand.defaultTheme);
  // The stored choice is only readable in the browser; reading it after mount
  // keeps the server and first client render the same.
  useEffect(() => {
    setTheme(readThemePreference(brand.defaultTheme));
  }, []);

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex rounded-md border border-border bg-raised p-0.5"
    >
      {OPTIONS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          onClick={() => {
            setTheme(value);
            applyThemePreference(value);
          }}
          className={cn(
            "h-button-xs rounded-sm px-inset-xs text-meta text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            theme === value
              ? "bg-background font-medium text-foreground"
              : "hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
