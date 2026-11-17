"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/feedback/toast";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AdminUserDetail } from "@/lib/api/types";
import { useErrorText } from "@/lib/api/use-error-text";
import { useErrorToast } from "@/lib/api/use-error-toast";
import {
  type UserAction,
  useUserAction,
} from "@/features/admin-users/use-users";

// The danger zone of the user detail page (FE-42; DESIGN_BRIEF 7.7, 6.3):
// disable or enable, revoke sessions and remove from the tenant, each with
// its consequence in one line and a confirmation. A rule identity enforces
// (LAST_ADMIN, SUPER_ADMIN_PROTECTED, SELF_ACTION) shows in the dialog in the
// rule's own words. When the rule is known before the click (own account),
// the buttons are disabled with the reason stated.

export const USERS_PATH = "/admin/users";

const DESTRUCTIVE: ReadonlySet<UserAction> = new Set(["disable", "remove"]);

export function UserActions({
  user,
  blockedReason,
}: {
  user: AdminUserDetail;
  /** Why no action applies to this user, stated instead of letting them fail. */
  blockedReason: string | undefined;
}) {
  const t = useTranslations("adminUsers.detail.actions");
  const router = useRouter();
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const action = useUserAction(user.id);
  const [open, setOpen] = useState<UserAction | undefined>();
  const [rule, setRule] = useState<string | undefined>();
  const name = user.display_name || user.email;
  const disabled = user.membership_status === "disabled";

  const items: { key: UserAction; destructive: boolean }[] = [
    disabled
      ? { key: "enable", destructive: false }
      : { key: "disable", destructive: true },
    { key: "revokeSessions", destructive: false },
    { key: "remove", destructive: true },
  ];

  const close = () => {
    setOpen(undefined);
    setRule(undefined);
  };

  const confirm = (key: UserAction) => {
    setRule(undefined);
    action.mutate(key, {
      onSuccess: () => {
        close();
        toast.success(t(`${key}.done`, { name }));
        if (key === "remove") {
          router.push(USERS_PATH);
        }
      },
      onError: (error) => {
        const described = errorText(error);
        if (
          described.treatment === "rule" ||
          described.treatment === "forbidden"
        ) {
          setRule(described.text);
          return;
        }
        close();
        errorToast(described);
      },
    });
  };

  return (
    <Card title={t("title")}>
      {blockedReason && <Alert tone="info">{blockedReason}</Alert>}
      <ul className="flex flex-col">
        {items.map(({ key, destructive }) => (
          <li
            key={key}
            className="flex flex-col gap-2 border-t border-rule py-3 first:border-t-0 first:pt-0 last:pb-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium">{t(`${key}.label`)}</span>
              <span className="text-small text-muted-foreground">
                {t(`${key}.consequence`)}
              </span>
            </div>
            <div>
              <Button
                type="button"
                variant={destructive ? "destructive" : "outline"}
                size="sm"
                disabled={blockedReason !== undefined}
                onClick={() => {
                  setRule(undefined);
                  setOpen(key);
                }}
              >
                {t(`${key}.label`)}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {open && (
        <ConfirmDialog
          open
          onOpenChange={(next) => {
            if (!next) {
              close();
            }
          }}
          destructive={DESTRUCTIVE.has(open)}
          pending={action.isPending}
          title={t(`${open}.confirmTitle`, { name })}
          description={t(`${open}.confirmBody`, { name })}
          confirmLabel={t(`${open}.label`)}
          onConfirm={() => {
            confirm(open);
          }}
        >
          {rule && <Alert tone="negative">{rule}</Alert>}
        </ConfirmDialog>
      )}
    </Card>
  );
}
