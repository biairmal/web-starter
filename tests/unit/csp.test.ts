import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, createNonce } from "@/lib/security/csp";

describe("content security policy", () => {
  const policy = contentSecurityPolicy({
    nonce: "abc123",
    identityPublicUrl: "https://id.example.com/some/path",
    development: false,
  });

  it("matches TRD 11.2 with the request's nonce", () => {
    expect(policy).toBe(
      [
        "default-src 'self'",
        "script-src 'self' 'nonce-abc123' 'strict-dynamic'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "form-action 'self' https://id.example.com",
        "base-uri 'self'",
      ].join("; "),
    );
  });

  it("allows eval only in development", () => {
    expect(policy).not.toContain("unsafe-eval");
    expect(
      contentSecurityPolicy({
        nonce: "n",
        identityPublicUrl: "https://id.example.com",
        development: true,
      }),
    ).toContain("script-src 'self' 'nonce-n' 'strict-dynamic' 'unsafe-eval'");
  });

  it("makes a fresh 128-bit nonce each time", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(Buffer.from(a, "base64")).toHaveLength(16);
  });
});
