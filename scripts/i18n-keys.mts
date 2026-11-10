import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

// Compares the message keys of every locale with English, the source (TRD 12).

export type Messages = { [key: string]: string | Messages };

export const SOURCE_LOCALE = "en";

export const messagesDir = fileURLToPath(
  new URL("../messages/", import.meta.url),
);

/** Every leaf key as a dotted path. */
export function flattenKeys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : flattenKeys(value, path);
  });
}

export type LocaleProblems = {
  locale: string;
  /** In English but not in this locale. */
  missing: string[];
  /** In this locale but not in English. */
  extra: string[];
};

export function compareLocales(
  source: Messages,
  others: Record<string, Messages>,
): LocaleProblems[] {
  const sourceKeys = new Set(flattenKeys(source));
  return Object.entries(others)
    .map(([locale, messages]) => {
      const keys = new Set(flattenKeys(messages));
      return {
        locale,
        missing: [...sourceKeys].filter((key) => !keys.has(key)).sort(),
        extra: [...keys].filter((key) => !sourceKeys.has(key)).sort(),
      };
    })
    .filter((problem) => problem.missing.length + problem.extra.length > 0);
}

/** Reads every `messages/*.json`, keyed by locale. */
export function readAllMessages(dir: string = messagesDir): {
  source: Messages;
  others: Record<string, Messages>;
} {
  // A byte-order mark, which some Windows editors write, is not valid JSON.
  const read = (locale: string) =>
    JSON.parse(
      readFileSync(join(dir, `${locale}.json`), "utf8").replace(/^﻿/, ""),
    ) as Messages;
  const locales = readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => basename(file, ".json"));
  return {
    source: read(SOURCE_LOCALE),
    others: Object.fromEntries(
      locales
        .filter((locale) => locale !== SOURCE_LOCALE)
        .map((locale) => [locale, read(locale)]),
    ),
  };
}
