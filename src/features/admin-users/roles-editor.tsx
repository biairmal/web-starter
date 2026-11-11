"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useMe } from "@/components/auth/session-provider";
import { useCan } from "@/components/auth/can";
import { ErrorState } from "@/components/feedback/error-state";
import { SkeletonBar } from "@/components/feedback/page-skeleton";
import { RuleDialog } from "@/components/feedback/rule-dialog";
import { Button } from "@/components/ui/button";
import type { AdminUserDetail } from "@/lib/api/types";
import { can } from "@/lib/authz/can";
import { ROLES_MANAGE, USERS_MANAGE } from "@/lib/authz/permissions";
import { useErrorText } from "@/lib/api/use-error-text";
import { useErrorToast } from "@/lib/api/use-error-toast";
import { RoleChecklist } from "@/features/admin-users/role-checklist";
import { Pill } from "@/features/admin-users/user-status";
import {
  useRoleOptions,
  useRolePermissions,
  useSetUserRoles,
  useUserAction,
} from "@/features/admin-users/use-users";

// The roles card of the user detail page (FE-42, FE-23; APP_FLOW 5.12). Edit
// shows every tenant role; one granting a permission the admin does not hold
// is disabled with the reason, unless the user already has it. Save sends the full list, then a toast says
// when the user sees it, with "Revoke sessions now" to make it immediate.

/** How long the saved toast offers "Revoke sessions now". */
const REVOKE_WINDOW_MS = 10_000;

function RoleEditForm({
  user,
  onSaved,
  onCancel,
}: {
  user: AdminUserDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("adminUsers.detail.roles");
  const me = useMe();
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const roles = useRoleOptions();
  const items = roles.data?.items ?? [];
  const permissions = useRolePermissions(items.map((role) => role.id));
  const save = useSetUserRoles(user.id);
  const [value, setValue] = useState(() => user.roles.map((role) => role.id));
  const assigned = new Set(user.roles.map((role) => role.id));
  const [rule, setRule] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();

  const onSave = () => {
    setMessage(undefined);
    save.mutate(value, {
      onSuccess: onSaved,
      onError: (error) => {
        const described = errorText(error);
        if (described.treatment === "rule") {
          setRule(described.text);
        } else if (described.treatment === "toast") {
          errorToast(described);
        } else {
          setMessage(described.text);
        }
      },
    });
  };

  if (roles.isPending) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <span className="sr-only">{t("loading")}</span>
        <SkeletonBar className="h-24 w-full" />
      </div>
    );
  }
  if (roles.isError) {
    return (
      <ErrorState
        className="py-2"
        title={t("loadFailed")}
        error={roles.error}
        retrying={roles.isFetching}
        onRetry={() => {
          void roles.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RoleChecklist
        legend={t("legend")}
        roles={items}
        value={value}
        onChange={setValue}
        disabledReason={(role) => {
          // Identity checks only the roles a change adds, so a role the
          // user already has can always be taken away.
          if (assigned.has(role.id)) {
            return undefined;
          }
          const granted = permissions.get(role.id);
          return granted?.some((key) => !can(me, key))
            ? t("notHeld")
            : undefined;
        }}
      />
      {message && (
        <p role="alert" className="text-body text-negative">
          {message}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={save.isPending}
          aria-busy={save.isPending || undefined}
          onClick={onSave}
        >
          {t("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={save.isPending}
          onClick={onCancel}
        >
          {t("cancel")}
        </Button>
      </div>
      <RuleDialog
        title={t("ruleTitle")}
        rule={rule}
        onClose={() => {
          setRule(undefined);
        }}
      />
    </div>
  );
}

export function RolesEditor({
  user,
  readOnlyReason,
}: {
  user: AdminUserDetail;
  /** Why this user's roles cannot be changed (own account, super admin). */
  readOnlyReason: string | undefined;
}) {
  const t = useTranslations("adminUsers.detail.roles");
  const canManage = useCan(USERS_MANAGE);
  const canListRoles = useCan(ROLES_MANAGE);
  const [editing, setEditing] = useState(false);
  const editable = canManage && readOnlyReason === undefined;
  const errorToast = useErrorToast();
  // Outlives the form, which unmounts when editing ends.
  const revoke = useUserAction(user.id);
  const name = user.display_name || user.email;

  const onSaved = () => {
    setEditing(false);
    toast.success(t("saved", { name }), {
      duration: REVOKE_WINDOW_MS,
      action: {
        label: t("revokeNow"),
        onClick: () => {
          revoke.mutate("revokeSessions", {
            onSuccess: () => {
              toast.success(t("revoked", { name }));
            },
            onError: errorToast,
          });
        },
      },
    });
  };

  return (
    <section
      aria-labelledby="user-roles"
      className="flex flex-col gap-3 rounded-lg border border-border p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="user-roles" className="text-section font-semibold">
          {t("title")}
        </h2>
        {editable && canListRoles && !editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(true);
            }}
          >
            {t("edit")}
          </Button>
        )}
      </div>
      {readOnlyReason && (
        <p className="rounded-md bg-pill-neutral px-3 py-2 text-body text-pill-neutral-ink">
          {readOnlyReason}
        </p>
      )}
      {editing ? (
        <RoleEditForm
          user={user}
          onSaved={onSaved}
          onCancel={() => {
            setEditing(false);
          }}
        />
      ) : (
        <>
          {user.roles.length === 0 ? (
            <p className="text-body text-muted-foreground">{t("none")}</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {user.roles.map((role) => (
                <li key={role.id}>
                  <Pill tone="neutral">{role.name}</Pill>
                </li>
              ))}
            </ul>
          )}
          {editable && !canListRoles && (
            <p className="text-small text-muted-foreground">
              {t("needsRolesManage")}
            </p>
          )}
        </>
      )}
    </section>
  );
}
