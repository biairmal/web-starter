import { describe, expect, it } from "vitest";
import { createKeyRing, seal, unseal } from "@/lib/session/crypto";

const secret = (fill: number) => Buffer.alloc(32, fill).toString("base64");

describe("session cookie crypto", () => {
  it("opens what it sealed", async () => {
    const ring = createKeyRing([secret(1)]);
    const jwe = await seal({ v: 1, token: "abc", exp: 123 }, ring);
    expect(jwe.split(".")).toHaveLength(5);
    expect(jwe).not.toContain("abc");
    await expect(unseal(jwe, ring)).resolves.toEqual({
      v: 1,
      token: "abc",
      exp: 123,
    });
  });

  it("uses the default key ring from SESSION_SECRET", async () => {
    const jwe = await seal({ hello: "world" });
    await expect(unseal(jwe)).resolves.toEqual({ hello: "world" });
  });

  it("still opens a cookie sealed with an old key after rotation", async () => {
    const old = createKeyRing([secret(1)]);
    const rotated = createKeyRing([secret(2), secret(1)]);
    const jwe = await seal({ n: 1 }, old);
    await expect(unseal(jwe, rotated)).resolves.toEqual({ n: 1 });
  });

  it("seals with the first key of the ring", async () => {
    const rotated = createKeyRing([secret(2), secret(1)]);
    const newOnly = createKeyRing([secret(2)]);
    const oldOnly = createKeyRing([secret(1)]);
    const jwe = await seal({ n: 2 }, rotated);
    await expect(unseal(jwe, newOnly)).resolves.toEqual({ n: 2 });
    await expect(unseal(jwe, oldOnly)).resolves.toBeNull();
  });

  it("returns null once the sealing key is removed from the ring", async () => {
    const jwe = await seal({ n: 1 }, createKeyRing([secret(1)]));
    await expect(unseal(jwe, createKeyRing([secret(2)]))).resolves.toBeNull();
  });

  it("returns null for a tampered value", async () => {
    const ring = createKeyRing([secret(1)]);
    const parts = (await seal({ n: 1 }, ring)).split(".");
    const ciphertext = parts[3] ?? "";
    parts[3] = (ciphertext.startsWith("A") ? "B" : "A") + ciphertext.slice(1);
    await expect(unseal(parts.join("."), ring)).resolves.toBeNull();
  });

  it("returns null for a value that is not a JWE", async () => {
    await expect(unseal("not-a-jwe")).resolves.toBeNull();
    await expect(unseal("")).resolves.toBeNull();
  });

  it("derives a 32-byte key from a longer secret", async () => {
    const ring = createKeyRing([Buffer.alloc(64, 3).toString("base64")]);
    expect(ring[0]).toHaveLength(32);
    await expect(unseal(await seal({ ok: true }, ring), ring)).resolves.toEqual(
      { ok: true },
    );
  });

  it("refuses an empty key ring", () => {
    expect(() => createKeyRing([])).toThrow(/at least one secret/);
  });
});
