"use client";

import { ChevronRight, UserX } from "lucide-react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useMe } from "@/components/auth/session-provider";
import { useCan } from "@/components/auth/can";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { SkeletonBar } from "@/components/feedback/page-skeleton";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/errors";
import type { AdminUserDetail } from "@/lib/api/types";
import { USERS_MANAGE } from "@/lib/authz/permissions";
import { RolesEditor } from "@/features/admin-users/roles-editor";
import { USERS_PATH, UserActions } from "@/features/admin-users/user-actions";
import { UserStatusPill } from "@/features/admin-users/user-status";
import { useUser } from "@/features/admin-users/use-users";

// The user detail page (FE-42, FE-47; APP_FLOW 5.12; DESIGN_BRIEF 7.7):
// "Is this person's access right?" Profile and roles on the left, membership
// and the danger zone on the right. The admin's own account is read-only,
// because identity refuses a change to it (SELF_ESCALATION, SELF_ACTION).

const NOW_REFRESH_MS = 60_000;

function Breadcrumb({ name }: { name: React.ReactNode }) {
  const t = useTranslations("adminUsers.detail");
  return (
    <nav aria-label={t("breadcrumb")}>
      <ol className="flex items-center gap-1 text-body text-muted-foreground">
        <li>
          <Link
            href={USERS_PATH}
            className="hover:text-foreground hover:underline"
          >
            {t("users")}
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-4 rtl:rotate-180" />
        </li>
        <li aria-current="page" className="truncate text-foreground">
          {name}
        </li>
      </ol>
    </nav>
  );
}

function KeyValue({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="text-body">{children}</dd>
    </div>
  );
}

function Profile({ user }: { user: AdminUserDetail }) {
  const t = useTranslations("adminUsers.detail.profile");
  const methods = [
    user.providers.password && t("password"),
    user.providers.google && t("google"),
  ].filter((entry): entry is string => typeof entry === "string");
  return (
    <section
      aria-labelledby="user-profile"
      className="flex flex-col gap-3 rounded-lg border border-border p-5"
    >
      <h2 id="user-profile" className="text-section font-semibold">
        {t("title")}
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <KeyValue label={t("name")}>
          {user.display_name || (
            <span className="text-muted-foreground">{t("noName")}</span>
          )}
        </KeyValue>
        <KeyValue label={t("email")}>
          <span className="break-all">{user.email}</span>
        </KeyValue>
        <KeyValue label={t("account")}>
          {t(`accountStatus.${user.status}`)}
        </KeyValue>
        <KeyValue label={t("methods")}>
          {methods.length > 0 ? methods.join(", ") : t("noMethods")}
        </KeyValue>
      </dl>
    </section>
  );
}

function Membership({ user }: { user: AdminUserDetail }) {
  const t = useTranslations("adminUsers.detail.membership");
  const format = useFormatter();
  const now = useNow({ updateInterval: NOW_REFRESH_MS });
  return (
    <section
      aria-labelledby="user-membership"
      className="flex flex-col gap-3 rounded-lg border border-border bg-raised p-5"
    >
      <h2 id="user-membership" className="text-section font-semibold">
        {t("title")}
      </h2>
      <dl className="flex flex-col gap-3">
        <KeyValue label={t("status")}>
          <UserStatusPill user={user} />
        </KeyValue>
        <KeyValue label={t("added")}>
          {format.dateTime(new Date(user.created_at), { dateStyle: "medium" })}
        </KeyValue>
        <KeyValue label={t("lastSignIn")}>
          {user.last_sign_in_at
            ? format.relativeTime(new Date(user.last_sign_in_at), now)
            : t("never")}
        </KeyValue>
      </dl>
    </section>
  );
}

function DetailSkeleton() {
  const t = useTranslations("feedback");
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">{t("loading")}</span>
      <SkeletonBar className="w-48" />
      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonBar className="h-40 w-full lg:col-span-2" />
        <SkeletonBar className="h-40 w-full" />
      </div>
    </div>
  );
}

export function UserDetail({ id }: { id: string }) {
  const t = useTranslations("adminUsers.detail");
  const me = useMe();
  const canManage = useCan(USERS_MANAGE);
  const user = useUser(id);

  if (user.isPending) {
    return <DetailSkeleton />;
  }
  if (user.isError) {
    if (isApiError(user.error) && user.error.status === 404) {
      return (
        <EmptyState
          icon={UserX}
          title={t("notFound")}
          description={t("notFoundBody")}
          action={
            <Button asChild variant="outline">
              <Link href={USERS_PATH}>{t("backToUsers")}</Link>
            </Button>
          }
        />
      );
    }
    return (
      <ErrorState
        title={t("loadFailed")}
        error={user.error}
        retrying={user.isFetching}
        onRetry={() => {
          void user.refetch();
        }}
      />
    );
  }

  const data = user.data;
  const name = data.display_name || data.email;
  const self = data.id === me.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Breadcrumb name={name} />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-title font-semibold">{name}</h1>
          <UserStatusPill user={data} />
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Profile user={data} />
          <RolesEditor
            user={data}
            readOnlyReason={self ? t("selfRoles") : undefined}
          />
        </div>
        <div className="flex flex-col gap-6">
          <Membership user={data} />
          {canManage && (
            <UserActions
              user={data}
              blockedReason={self ? t("selfActions") : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
