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
  poweredByHeader: false,
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
