import { z } from "zod";

// Pure schema for the server environment (TRD 4.1). Kept free of
// `server-only` so tests can import it. `env.ts` applies it at server start.

const base64Key = z
  .string()
  .regex(/^[A-Za-z0-9+/_-]+={0,2}$/, "must be base64")
  .refine((key) => Buffer.from(key, "base64").length >= 32, {
    message: "must decode to at least 32 bytes",
  });

// Comma-separated list: the first key encrypts, every key decrypts (rotation).
const sessionSecret = z
  .string({ error: "is required" })
  .min(1, { error: "is required" })
  .transform((value) => value.split(",").map((key) => key.trim()))
  .pipe(z.array(base64Key).min(1, { error: "must contain at least one key" }));

export const envSchema = z.object({
  APP_URL: z.url({ error: "must be an absolute URL" }),
  IDENTITY_INTERNAL_URL: z.url({ error: "must be an absolute URL" }),
  IDENTITY_PUBLIC_URL: z.url({ error: "must be an absolute URL" }),
  SESSION_SECRET: sessionSecret,
  SESSION_COOKIE_PREFIX: z
    .string()
    .regex(/^[a-z0-9]{1,16}$/, {
      error: "must be 1 to 16 lowercase letters or digits",
    })
    .default("ws"),
  TRUSTED_PROXY_HOPS: z.coerce
    .number({ error: "must be a number" })
    .int({ error: "must be a whole number" })
    .min(0, { error: "must be 0 or more" })
    .default(1),
  /** identity's modules.tenant.default_tenant_slug: the tenant that cannot be suspended. */
  DEFAULT_TENANT_SLUG: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,62}$/, {
      error: "must be a tenant slug: lowercase letters, digits and hyphens",
    })
    .default("default"),
  /**
   * The example notes service (go-service-template). Optional: without it
   * `/api/notes/*` answers 503 UPSTREAM_UNAVAILABLE. Business modules add
   * their own `<NAME>_INTERNAL_URL` here.
   */
  NOTES_INTERNAL_URL: z.url({ error: "must be an absolute URL" }).optional(),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["en", "id"]).default("en"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("info"),
});

export type Env = z.output<typeof envSchema>;

export class EnvError extends Error {
  constructor(readonly issues: readonly { name: string; message: string }[]) {
    const lines = issues.map((issue) => `  ${issue.name}: ${issue.message}`);
    super(
      [
        "Invalid environment configuration. Fix these variables (see .env.example):",
        ...lines,
      ].join("\n"),
    );
    this.name = "EnvError";
  }
}

/** Parses an environment object, or throws an EnvError naming each bad variable. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) {
    return result.data;
  }
  const issues = result.error.issues.map((issue) => ({
    name: String(issue.path[0] ?? "environment"),
    message: issue.message,
  }));
  throw new EnvError(issues);
}
