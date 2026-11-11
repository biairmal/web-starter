"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * A business rule identity enforced (`LAST_ADMIN`, `SELF_ESCALATION`,
 * `PERMISSION_NOT_HELD`…), explained in the rule's own words (TRD 10,
 * DESIGN_BRIEF 6.3). The form behind it keeps the user's edits.
 */
export function RuleDialog({
  rule,
  title,
  onClose,
}: {
  /** The explanation; the dialog is open while it is set. */
  rule: string | undefined;
  title: React.ReactNode;
  onClose: () => void;
}) {
  const t = useTranslations("feedback.rule");
  return (
    <Dialog
      open={rule !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert aria-hidden="true" className="size-4 text-negative" />
            {title}
          </DialogTitle>
          <DialogDescription>{rule}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
