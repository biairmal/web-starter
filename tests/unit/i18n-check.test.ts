import { describe, expect, it } from "vitest";
import {
  compareLocales,
  flattenKeys,
  readAllMessages,
} from "../../scripts/i18n-keys.mts";

describe("i18n:check", () => {
  it("flattens nested messages into dotted keys", () => {
    expect(
      flattenKeys({ auth: { signIn: { title: "Sign in" } }, ok: "OK" }),
    ).toEqual(["auth.signIn.title", "ok"]);
  });

  it("reports a key that is in en but missing in id", () => {
    const problems = compareLocales(
      { auth: { title: "Sign in", submit: "Sign in" } },
      { id: { auth: { title: "Masuk" } } },
    );
    expect(problems).toEqual([
      { locale: "id", missing: ["auth.submit"], extra: [] },
    ]);
  });

  it("reports a key that is only in another locale", () => {
    const problems = compareLocales(
      { title: "Sign in" },
      { id: { title: "Masuk", stale: "Lama" } },
    );
    expect(problems).toEqual([{ locale: "id", missing: [], extra: ["stale"] }]);
  });

  it("passes when every locale has the same keys", () => {
    expect(
      compareLocales({ title: "Sign in" }, { id: { title: "Masuk" } }),
    ).toEqual([]);
  });

  it("finds no problem in the committed message files", () => {
    const { source, others } = readAllMessages();
    expect(Object.keys(others)).toContain("id");
    expect(compareLocales(source, others)).toEqual([]);
  });
});
