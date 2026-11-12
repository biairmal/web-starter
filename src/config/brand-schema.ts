import { z } from "zod";

// Checks src/config/brand.ts (tests/unit/brand.test.ts). Kept apart from
// brand.ts, which the browser loads on every page, so Zod is not bundled with it.
export const brandSchema = z.object({
  appName: z
    .string()
    .min(1)
    .max(24, { error: "must be 24 characters or fewer" }),
  logo: z.object({
    light: z.string().min(1),
    dark: z.string(),
    mark: z.string().min(1),
  }),
  supportEmail: z.email({ error: "must be an email address" }),
  legal: z.object({
    termsUrl: z.string(),
    privacyUrl: z.string(),
  }),
  defaultTheme: z.enum(["light", "dark", "system"]),
});

export type Brand = z.output<typeof brandSchema>;
