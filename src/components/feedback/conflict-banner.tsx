"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shown on 409 VERSION_CONFLICT (TRD 8.5, FE-45). The form keeps the user's
 * edits; Reload refetches and discards them, Copy my changes puts them on the
 * clipboard first.
 */
export function ConflictBanner({
  onReload,
  changes,
  className,
}: {
  onReload: () => void;
  /** The user's edits as text, e.g. a list of added and removed permissions. */
  changes: string;
  className?: string;
}) {
  const t = useTranslations("feedback.conflict");
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  const copyChanges = async () => {
    try {
      await navigator.clipboard.writeText(changes);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-warning/30 bg-pill-warning px-4 py-3 text-body text-pill-warning-ink",
        className,
      )}
    >
      <p className="flex min-w-0 flex-1 items-center gap-2">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        {t("message")}
      </p>
      <div className="flex items-center gap-2">
        <span aria-live="polite" className="text-small">
          {copy === "copied" && t("copied")}
          {copy === "failed" && t("copyFailed")}
        </span>
        <Button variant="outline" size="sm" onClick={() => void copyChanges()}>
          {t("copy")}
        </Button>
        <Button size="sm" onClick={onReload}>
          {t("reload")}
        </Button>
      </div>
    </div>
  );
}
