import "server-only";

import { hkdfSync } from "node:crypto";
import { CompactEncrypt, compactDecrypt } from "jose";
import { env } from "@/config/env";

// Cookie encryption (TRD 5.1, 8.1): JWE compact serialisation, `dir` key
// management with A256GCM. The first key encrypts; every key decrypts, so a new
// key can be put first while cookies sealed with the old one still open.

const HKDF_INFO = "web-starter session cookie v1";
const KEY_BYTES = 32;

export type KeyRing = readonly Uint8Array[];

/**
 * Builds the key ring from base64 secrets. Each secret is stretched with HKDF
 * to exactly 32 bytes, because the environment accepts secrets of 32 bytes or
 * more and A256GCM needs exactly 32.
 */
export function createKeyRing(secrets: readonly string[]): KeyRing {
  if (secrets.length === 0) {
    throw new Error("the session key ring needs at least one secret");
  }
  return secrets.map(
    (secret) =>
      new Uint8Array(
        hkdfSync(
          "sha256",
          Buffer.from(secret, "base64"),
          new Uint8Array(0),
          HKDF_INFO,
          KEY_BYTES,
        ),
      ),
  );
}

let defaultRing: KeyRing | undefined;

function sessionKeyRing(): KeyRing {
  defaultRing ??= createKeyRing(env.SESSION_SECRET);
  return defaultRing;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Encrypts a JSON value with the first key of the ring. */
export async function seal(
  payload: unknown,
  ring: KeyRing = sessionKeyRing(),
): Promise<string> {
  const [key] = ring;
  if (!key) {
    throw new Error("the session key ring is empty");
  }
  return new CompactEncrypt(encoder.encode(JSON.stringify(payload)))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(key);
}

/**
 * Decrypts a value sealed with any key of the ring. Returns `null` for a value
 * that is malformed, tampered with, sealed with an unknown key or not JSON.
 * The caller validates the shape.
 */
export async function unseal(
  jwe: string,
  ring: KeyRing = sessionKeyRing(),
): Promise<unknown> {
  for (const key of ring) {
    try {
      const { plaintext } = await compactDecrypt(jwe, key, {
        keyManagementAlgorithms: ["dir"],
        contentEncryptionAlgorithms: ["A256GCM"],
      });
      return JSON.parse(decoder.decode(plaintext)) as unknown;
    } catch {
      // Wrong key or bad value: try the next key.
    }
  }
  return null;
}
