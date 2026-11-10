"use client";

import "./globals.css";
import { createTranslator } from "next-intl";
import { ErrorReference } from "@/components/feedback/error-reference";
import { brand } from "@/config/brand";
import en from "../../messages/en.json";

// Shown when the root layout itself fails, so it renders its own <html> and
// has no providers: no next-intl context and no theme script. Its copy is the
// English source, read straight from messages/en.json.
const t = createTranslator({
  locale: "en",
  messages: en,
  namespace: "errorPages.error",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-frame font-sans text-foreground antialiased">
        <main className="mx-auto flex min-h-dvh max-w-100 flex-col justify-center gap-2 px-4">
          <p className="mb-6 text-section font-semibold">{brand.appName}</p>
          <h1 className="text-title font-semibold">{t("title")}</h1>
          <p className="text-body text-muted-foreground">
            {t("body", { supportEmail: brand.supportEmail })}
          </p>
          {error.digest && (
            <ErrorReference
              label={t("reference", { reference: error.digest })}
              value={error.digest}
              copyLabel={t("copy")}
              copiedLabel={t("copied")}
            />
          )}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={reset}
              className="h-9 rounded-md bg-primary px-4 text-body font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t("retry")}
            </button>
            {/* A full page load on purpose: the root layout failed, so a
                client-side navigation could hit the same error. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="text-body text-brand-accent underline-offset-4 hover:underline"
            >
              {t("home")}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
