"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { RuleDialog } from "@/components/feedback/rule-dialog";
import { isApiError } from "@/lib/api/errors";
import type { RoleSummary } from "@/lib/api/types";
import { useErrorText } from "@/lib/api/use-error-text";
import { useErrorToast } from "@/lib/api/use-error-toast";
import { useDeleteRole } from "@/features/admin-roles/use-roles";

// Deleting a role (FE-43, APP_FLOW 5.14, DESIGN_BRIEF 6.3). The first dialog
// names the role. On ROLE_IN_USE it becomes "N users have this role" with
// "Delete anyway" (force), which asks for the role's name to be typed,
// because it removes every assignment and cannot be undone. LAST_ADMIN and
// SYSTEM_ROLE close it and explain the rule.

type Stage = "confirm" | "inUse";

export function DeleteRoleDialog({
  role,
  onClose,
  onDeleted,
}: {
  /** The role to delete; the dialog is open while it is set. */
  role: Pick<RoleSummary, "id" | "name" | "user_count"> | undefined;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const t = useTranslations("adminRoles.delete");
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const remove = useDeleteRole();
  const [stage, setStage] = useState<Stage>("confirm");
  const [rule, setRule] = useState<string | undefined>();

  const close = () => {
    setStage("confirm");
    onClose();
  };

  const confirm = () => {
    if (!role) {
      return;
    }
    const force = stage === "inUse";
    remove.mutate(
      { id: role.id, force },
      {
        onSuccess: () => {
          close();
          toast.success(t("deleted", { name: role.name }));
          onDeleted?.();
        },
        onError: (error) => {
          if (isApiError(error) && error.reason === "ROLE_IN_USE" && !force) {
            setStage("inUse");
            return;
          }
          const described = errorText(error);
          close();
          if (described.treatment === "rule") {
            setRule(described.text);
          } else {
            errorToast(described);
          }
        },
      },
    );
  };

  return (
    <>
      {role && (
        <ConfirmDialog
          // A new stage is a new dialog, so the typed name starts empty.
          key={stage}
          open
          onOpenChange={(open) => {
            if (!open) {
              close();
            }
          }}
          destructive
          pending={remove.isPending}
          title={t("title", { name: role.name })}
          description={
            stage === "inUse"
              ? t("inUseBody", { count: role.user_count })
              : t("body")
          }
          confirmLabel={stage === "inUse" ? t("force") : t("confirm")}
          {...(stage === "inUse" ? { confirmText: role.name } : {})}
          onConfirm={confirm}
        />
      )}
      <RuleDialog
        title={t("refused")}
        rule={rule}
        onClose={() => {
          setRule(undefined);
        }}
      />
    </>
  );
}
