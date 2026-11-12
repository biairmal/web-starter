import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Static security headers (TRD 11.2). The Content-Security-Policy needs a
// per-request nonce, so middleware sets it (src/middleware.ts).

const production = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  ...(production
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

// Pages that read a token from the URL fragment (TRD 6.3) send no referrer.
const fragmentTokenPages = ["/verify-email", "/reset-password", "/invite"];

const nextConfig: NextConfig = {
  // A self-contained server in .next/standalone for the Docker image (TRD 14).
  // Only when the Dockerfile asks: copying it makes symlinks, which Windows
  // refuses without Developer Mode, so a local `pnpm build` would fail.
  ...(process.env.NEXT_OUTPUT === "standalone"
    ? { output: "standalone" as const }
    : {}),
  // Traced into the standalone output but never loaded by the server: the
  // app uses no next/image (sharp) and the config is compiled in (typescript).
  // Keeps the image under its size budget.
  outputFileTracingExcludes: {
    "*": [
      "**/node_modules/sharp/**",
      "**/node_modules/@img/**",
      "**/node_modules/typescript/**",
    ],
  },
  poweredByHeader: false,
  // forbidden() renders forbidden.tsx with status 403 (requirePermission).
  experimental: { authInterrupts: true },
  // The dev indicator would sit on the sidebar's user row (bottom left).
  devIndicators: { position: "bottom-right" },
  headers() {
    return Promise.resolve([
      { source: "/:path*", headers: securityHeaders },
      ...fragmentTokenPages.map((source) => ({
        source,
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      })),
    ]);
  },
};

export default withNextIntl(nextConfig);
