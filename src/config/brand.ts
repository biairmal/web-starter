// The one file edited per client (PRD FE-60, TRD 4.2). Colours and fonts are not
// here: they live in src/app/tokens.css and src/app/fonts.ts (DESIGN_BRIEF 3.1).
export const brand = {
  appName: "Acme Portal",
  logo: {
    light: "/brand/logo.svg",
    dark: "/brand/logo-dark.svg",
    mark: "/brand/mark.svg",
  },
  supportEmail: "support@acme.com",
  legal: { termsUrl: "", privacyUrl: "" }, // links hidden when empty
  defaultTheme: "system" as "light" | "dark" | "system",
} as const;
