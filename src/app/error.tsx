"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ErrorReference } from "@/components/feedback/error-reference";
import { ErrorPageBody, PublicFrame } from "@/components/layout/public-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";

// 500 for an error thrown while rendering (DESIGN_BRIEF 7.11): try again,
// go home, and a reference to quote to support. The digest matches the
// server's log line; the error's message is never shown.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPages.error");
  return (
    <PublicFrame>
      <ErrorPageBody
        title={t("title")}
        body={t("body", { supportEmail: brand.supportEmail })}
        primary={<Button onClick={reset}>{t("retry")}</Button>}
        secondary={
          <Link href="/" className={buttonVariants({ variant: "link" })}>
            {t("home")}
          </Link>
        }
      >
        {error.digest && (
          <ErrorReference
            label={t("reference", { reference: error.digest })}
            value={error.digest}
            copyLabel={t("copy")}
            copiedLabel={t("copied")}
          />
        )}
      </ErrorPageBody>
    </PublicFrame>
  );
}
