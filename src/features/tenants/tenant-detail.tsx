"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Building2,
  ChevronRight,
  Loader2,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useMe } from "@/components/auth/session-provider";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ConflictBanner } from "@/components/feedback/conflict-banner";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { SkeletonBar } from "@/components/feedback/page-skeleton";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/api/apply-server-errors";
import { isApiError } from "@/lib/api/errors";
import type { Tenant } from "@/lib/api/types";
import { useErrorText } from "@/lib/api/use-error-text";
import { useErrorToast } from "@/lib/api/use-error-toast";
import { switchTenant } from "@/lib/switch-tenant";
import { TenantStatusPill } from "@/features/tenants/tenant-status";
import {
  TENANTS_PATH,
  useTenant,
  useUpdateTenant,
} from "@/features/tenants/use-tenants";

// The tenant detail page (FE-51; APP_FLOW 5.15; DESIGN_BRIEF 7.10): the
// tenant's facts, "Open as admin" (switches into the tenant and reloads),
// Rename, and a danger zone with Suspend or Reactivate. Every change sends
// `If-Match`; on VERSION_CONFLICT the dialog keeps what was typed and offers
// Reload. The default tenant cannot be suspended, so it has no Suspend.

/** Identity's limit for a tenant name. */
const NAME_MAX = 100;

function isConflict(error: unknown): boolean {
  return isApiError(error) && error.reason === "VERSION_CONFLICT";
}

function Breadcrumb({ name }: { name: string }) {
  const t = useTranslations("tenants.detail");
  return (
    <nav aria-label={t("breadcrumb")}>
      <ol className="flex items-center gap-1 text-body text-muted-foreground">
        <li>
          <Link
            href={TENANTS_PATH}
            className="hover:text-foreground hover:underline"
          >
            {t("tenants")}
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

function Facts({ tenant }: { tenant: Tenant }) {
  const t = useTranslations("tenants.detail.facts");
  const format = useFormatter();
  return (
    <section
      aria-labelledby="tenant-facts"
      className="flex flex-col gap-3 rounded-lg border border-border bg-raised p-5"
    >
      <h2 id="tenant-facts" className="text-section font-semibold">
        {t("title")}
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <KeyValue label={t("slug")}>
          <span className="font-mono">{tenant.slug}</span>
        </KeyValue>
        <KeyValue label={t("status")}>
          <TenantStatusPill status={tenant.status} />
        </KeyValue>
        <KeyValue label={t("members")}>
          {tenant.member_count === undefined
            ? t("unknown")
            : format.number(tenant.member_count)}
        </KeyValue>
        <KeyValue label={t("created")}>
          {format.dateTime(new Date(tenant.created_at), {
            dateStyle: "medium",
          })}
        </KeyValue>
      </dl>
    </section>
  );
}

/** A rule identity enforces, in its own words, inside a dialog. */
function RuleAlert({ text }: { text: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md bg-pill-negative px-3 py-2 text-body text-pill-negative-ink"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  );
}

function RenameForm({
  tenant,
  onDone,
  onCancel,
  onReload,
}: {
  tenant: Tenant;
  onDone: () => void;
  onCancel: () => void;
  onReload: () => void;
}) {
  const t = useTranslations("tenants.detail.rename");
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const update = useUpdateTenant(tenant);
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const form = useForm<{ name: string }>({
    resolver: zodResolver(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, { error: t("nameRequired") })
          .max(NAME_MAX, { error: t("nameTooLong", { max: NAME_MAX }) }),
      }),
    ),
    mode: "onTouched",
    defaultValues: { name: tenant.name },
  });

  const onSubmit = form.handleSubmit(async ({ name }) => {
    setMessage(undefined);
    setConflict(false);
    try {
      await update.mutateAsync({ name: name.trim() });
      onDone();
    } catch (error) {
      if (isConflict(error)) {
        setConflict(true);
        return;
      }
      if (applyServerErrors(form, ["name"], error).applied.length > 0) {
        return;
      }
      const described = errorText(error);
      if (described.treatment === "toast") {
        errorToast(described);
        return;
      }
      setMessage(described.text);
    }
  });

  return (
    <form
      method="post"
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      {conflict && (
        <ConflictBanner
          changes={form.getValues("name")}
          onReload={() => {
            setConflict(false);
            onReload();
          }}
        />
      )}
      <FormField
        control={form.control}
        name="name"
        label={t("name")}
        required
        render={(field) => <Input {...field} autoComplete="off" />}
      />
      <FormErrorSummary
        invalidCount={
          form.formState.submitCount > 0
            ? Object.keys(form.formState.errors).length
            : 0
        }
        message={message}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <SubmitButton pending={form.formState.isSubmitting}>
          {t("submit")}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

function Rename({
  tenant,
  onReload,
}: {
  tenant: Tenant;
  onReload: () => void;
}) {
  const t = useTranslations("tenants.detail.rename");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t("open")}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { name: tenant.name })}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        {open && (
          <RenameForm
            tenant={tenant}
            onReload={onReload}
            onCancel={() => {
              setOpen(false);
            }}
            onDone={() => {
              setOpen(false);
              toast.success(t("done"));
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DangerZone({
  tenant,
  isDefault,
  onReload,
}: {
  tenant: Tenant;
  isDefault: boolean;
  onReload: () => void;
}) {
  const t = useTranslations("tenants.detail.danger");
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const update = useUpdateTenant(tenant);
  const [open, setOpen] = useState(false);
  const [rule, setRule] = useState<string | undefined>();
  const [conflict, setConflict] = useState(false);
  const suspending = tenant.status === "active";
  const action = suspending ? "suspend" : "reactivate";
  const members = tenant.member_count;

  const close = () => {
    setOpen(false);
    setRule(undefined);
    setConflict(false);
  };

  const confirm = () => {
    setRule(undefined);
    setConflict(false);
    update.mutate(
      { status: suspending ? "suspended" : "active" },
      {
        onSuccess: () => {
          close();
          toast.success(t(`${action}.done`, { name: tenant.name }));
        },
        onError: (error) => {
          if (isConflict(error)) {
            setConflict(true);
            return;
          }
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
      },
    );
  };

  return (
    <section
      aria-labelledby="tenant-danger"
      className="flex flex-col gap-4 rounded-lg border border-border p-5"
    >
      <h2 id="tenant-danger" className="text-section font-semibold">
        {t("title")}
      </h2>
      {isDefault ? (
        <p className="rounded-md bg-pill-neutral px-3 py-2 text-body text-pill-neutral-ink">
          {t("defaultTenant")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-body font-medium">
              {t(`${action}.label`)}
            </span>
            <span className="text-small text-muted-foreground">
              {t(`${action}.consequence`)}
            </span>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={suspending ? "text-negative" : undefined}
              onClick={() => {
                setRule(undefined);
                setConflict(false);
                setOpen(true);
              }}
            >
              {t(`${action}.label`)}
            </Button>
          </div>
        </div>
      )}
      {open && (
        <ConfirmDialog
          open
          onOpenChange={(next) => {
            if (!next) {
              close();
            }
          }}
          destructive={suspending}
          pending={update.isPending}
          title={t(`${action}.confirmTitle`, { name: tenant.name })}
          description={
            suspending && members !== undefined
              ? t("suspend.confirmBodyCount", { count: members })
              : t(`${action}.confirmBody`)
          }
          confirmLabel={t(`${action}.label`)}
          {...(suspending ? { confirmText: tenant.name } : {})}
          onConfirm={confirm}
        >
          {conflict && (
            <ConflictBanner
              changes={t(`${action}.label`)}
              onReload={() => {
                setConflict(false);
                onReload();
              }}
            />
          )}
          {rule && <RuleAlert text={rule} />}
        </ConfirmDialog>
      )}
    </section>
  );
}

function OpenAsAdmin({ tenant }: { tenant: Tenant }) {
  const t = useTranslations("tenants.detail");
  const errorToast = useErrorToast();
  const [pending, setPending] = useState(false);
  const suspended = tenant.status === "suspended";
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        disabled={suspended || pending}
        aria-busy={pending || undefined}
        aria-describedby={suspended ? "open-as-admin-note" : undefined}
        onClick={() => {
          setPending(true);
          switchTenant(tenant.id).catch((error: unknown) => {
            setPending(false);
            errorToast(error);
          });
        }}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <LogIn aria-hidden="true" />
        )}
        {t("openAsAdmin")}
      </Button>
      {suspended && (
        <p id="open-as-admin-note" className="text-small text-muted-foreground">
          {t("openSuspended")}
        </p>
      )}
    </div>
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

export function TenantDetail({
  id,
  defaultSlug,
}: {
  id: string;
  /** The slug of identity's default tenant, which cannot be suspended. */
  defaultSlug: string;
}) {
  const t = useTranslations("tenants.detail");
  const me = useMe();
  const tenant = useTenant(id);
  const reload = () => {
    void tenant.refetch();
  };

  if (tenant.isPending) {
    return <DetailSkeleton />;
  }
  if (tenant.isError) {
    if (isApiError(tenant.error) && tenant.error.status === 404) {
      return (
        <EmptyState
          icon={Building2}
          title={t("notFound")}
          description={t("notFoundBody")}
          action={
            <Button asChild variant="outline">
              <Link href={TENANTS_PATH}>{t("backToTenants")}</Link>
            </Button>
          }
        />
      );
    }
    return (
      <ErrorState
        title={t("loadFailed")}
        error={tenant.error}
        retrying={tenant.isFetching}
        onRetry={reload}
      />
    );
  }

  const data = tenant.data;
  const current = data.id === me.tenant.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Breadcrumb name={data.name} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-title font-semibold">{data.name}</h1>
              <TenantStatusPill status={data.status} />
            </div>
            {current && (
              <p className="text-body text-muted-foreground">{t("current")}</p>
            )}
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <Rename tenant={data} onReload={reload} />
            <OpenAsAdmin tenant={data} />
          </div>
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Facts tenant={data} />
        </div>
        <DangerZone
          tenant={data}
          isDefault={data.slug === defaultSlug}
          onReload={reload}
        />
      </div>
    </div>
  );
}
