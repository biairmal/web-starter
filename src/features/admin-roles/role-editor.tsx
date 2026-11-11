"use client";

import { ChevronRight, Info, Lock, ShieldX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { useMe } from "@/components/auth/session-provider";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ConflictBanner } from "@/components/feedback/conflict-banner";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { SkeletonBar } from "@/components/feedback/page-skeleton";
import { RuleDialog } from "@/components/feedback/rule-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { isApiError } from "@/lib/api/errors";
import type { Permission, Role } from "@/lib/api/types";
import { can } from "@/lib/authz/can";
import { useErrorText } from "@/lib/api/use-error-text";
import { useErrorToast } from "@/lib/api/use-error-toast";
import { cn } from "@/lib/utils";
import { DeleteRoleDialog } from "@/features/admin-roles/delete-role-dialog";
import {
  describeChanges,
  filterGroups,
  groupPermissions,
  permissionChanges,
} from "@/features/admin-roles/group-permissions";
import { PermissionMatrix } from "@/features/admin-roles/permission-matrix";
import { useUnsavedGuard } from "@/features/admin-roles/use-unsaved-guard";
import {
  ROLE_TEMPLATES_PATH,
  useCreateRoleTemplate,
  useDeleteRoleTemplate,
  useRoleTemplate,
  useSaveRoleTemplate,
} from "@/features/admin-roles/use-role-templates";
import {
  ROLE_DESCRIPTION_MAX,
  ROLE_NAME_MAX,
  useCreateRole,
  usePermissionCatalog,
  useRole,
  useSaveRole,
} from "@/features/admin-roles/use-roles";

// The role editor (FE-44, FE-45, FE-47; APP_FLOW 5.13; DESIGN_BRIEF 6.4,
// 7.8): "Exactly what does this role grant?" Name and description, then the
// permission matrix, then a sticky save bar once something changed. Create
// and edit are the same screen. A system role is read-only with the reason.
// A version conflict keeps the edits and shows the conflict banner; a rule
// identity enforces opens a dialog; leaving with unsaved changes asks first.
//
// The same editor edits a tenant's roles (`kind="role"`) and the super
// admin's role templates (`kind="template"`, FE-52; DESIGN_BRIEF 7.10). A
// template saves in one `PATCH`, is deleted without the role rules, and
// carries a standing notice that only tenants created later get the change.

export const ROLES_PATH = "/admin/roles";

export type EditorKind = "role" | "template";

const LIST_PATHS: Record<EditorKind, string> = {
  role: ROLES_PATH,
  template: ROLE_TEMPLATES_PATH,
};

/**
 * The editor's words that differ between a role and a template. Both
 * namespaces define every one of these keys.
 */
function useKindText(kind: EditorKind) {
  const role = useTranslations("adminRoles.editor");
  const template = useTranslations("adminRoles.templateEditor");
  return kind === "template" ? template : role;
}

/** "Changes apply only to tenants created later" (FE-52). */
export function TemplateNotice() {
  const t = useTranslations("adminRoles.templateEditor");
  return (
    <p className="flex items-start gap-2 rounded-md bg-pill-warning px-3 py-2 text-body text-pill-warning-ink">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {t("notice")}
    </p>
  );
}

type Baseline = {
  name: string;
  description: string;
  permissions: ReadonlySet<string>;
  version: number;
};

function baselineOf(role: Role | undefined): Baseline {
  return {
    name: role?.name ?? "",
    description: role?.description ?? "",
    permissions: new Set(role?.permissions ?? []),
    version: role?.version ?? 0,
  };
}

function Breadcrumb({
  name,
  kind,
}: {
  name: React.ReactNode;
  kind: EditorKind;
}) {
  const t = useTranslations("adminRoles.editor");
  const tKind = useKindText(kind);
  return (
    <nav aria-label={t("breadcrumb")}>
      <ol className="flex items-center gap-1 text-body text-muted-foreground">
        <li>
          <Link
            href={LIST_PATHS[kind]}
            className="hover:text-foreground hover:underline"
          >
            {tKind("roles")}
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

function EditorSkeleton() {
  const t = useTranslations("feedback");
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">{t("loading")}</span>
      <SkeletonBar className="w-48" />
      <SkeletonBar className="h-32 w-full" />
      <SkeletonBar className="h-64 w-full" />
    </div>
  );
}

function Form({
  kind,
  role,
  catalog,
  onReload,
}: {
  kind: EditorKind;
  /** The saved role; undefined on the create screen. */
  role: Role | undefined;
  catalog: readonly Permission[];
  onReload: () => Promise<Role | undefined>;
}) {
  const t = useTranslations("adminRoles.editor");
  const tKind = useKindText(kind);
  const tTemplate = useTranslations("adminRoles.templateEditor");
  const me = useMe();
  const router = useRouter();
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const nameId = useId();
  const descriptionId = useId();
  const searchId = useId();
  const save = useSaveRole();
  const create = useCreateRole();
  const saveTemplate = useSaveRoleTemplate();
  const createTemplate = useCreateRoleTemplate();
  const deleteTemplate = useDeleteRoleTemplate();
  const template = kind === "template";
  const listPath = LIST_PATHS[kind];

  const [baseline, setBaseline] = useState(() => baselineOf(role));
  const [name, setName] = useState(baseline.name);
  const [description, setDescription] = useState(baseline.description);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(baseline.permissions),
  );
  const [search, setSearch] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [conflict, setConflict] = useState(false);
  const [rule, setRule] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const readOnly = role?.is_system ?? false;
  const creating = role === undefined;
  const groups = useMemo(() => groupPermissions(catalog), [catalog]);
  const visible = filterGroups(groups, search);
  const changes = permissionChanges(baseline.permissions, selected);
  const fieldsDirty =
    name.trim() !== baseline.name ||
    description.trim() !== baseline.description;
  const keysDirty = changes.added.length + changes.removed.length > 0;
  const dirty = !readOnly && (fieldsDirty || keysDirty);
  const pending =
    save.isPending ||
    create.isPending ||
    saveTemplate.isPending ||
    createTemplate.isPending;

  useUnsavedGuard(dirty && !leaving, tKind("leaveConfirm"));

  const reset = (next: Baseline) => {
    setBaseline(next);
    setName(next.name);
    setDescription(next.description);
    setSelected(new Set(next.permissions));
  };

  const validate = (): string | undefined => {
    const trimmed = name.trim();
    if (!trimmed) {
      return t("nameRequired");
    }
    if (trimmed.length > ROLE_NAME_MAX) {
      return t("nameTooLong", { max: ROLE_NAME_MAX });
    }
    return undefined;
  };

  const onError = (error: unknown) => {
    if (isApiError(error) && error.reason === "VERSION_CONFLICT") {
      setConflict(true);
      return;
    }
    if (isApiError(error) && error.reason === "DUPLICATE") {
      setNameError(tKind("duplicate"));
      document.getElementById(nameId)?.focus();
      return;
    }
    const described = errorText(error);
    if (described.treatment === "rule") {
      setRule(described.text);
    } else if (described.treatment === "toast") {
      errorToast(described);
    } else {
      setMessage(described.text);
    }
  };

  const onSave = () => {
    setMessage(undefined);
    const invalid = validate();
    setNameError(invalid);
    if (invalid) {
      document.getElementById(nameId)?.focus();
      return;
    }
    const fields = { name: name.trim(), description: description.trim() };
    const permissions = [...selected].sort();
    if (creating) {
      const onCreated = {
        onSuccess: (created: Role) => {
          setLeaving(true);
          toast.success(tKind("created", { name: created.name }));
          router.replace(`${listPath}/${encodeURIComponent(created.id)}`);
        },
        onError,
      };
      const values = {
        name: fields.name,
        ...(fields.description ? { description: fields.description } : {}),
        permissions,
      };
      if (template) {
        createTemplate.mutate(values, onCreated);
      } else {
        create.mutate(values, onCreated);
      }
      return;
    }
    if (template) {
      saveTemplate.mutate(
        {
          id: role.id,
          version: baseline.version,
          changes: {
            ...(fieldsDirty ? fields : {}),
            ...(keysDirty ? { permissions } : {}),
          },
        },
        {
          onSuccess: (saved) => {
            setBaseline(baselineOf(saved));
            setConflict(false);
            toast.success(t("saved"));
          },
          onError,
        },
      );
      return;
    }
    save.mutate(
      {
        edits: {
          id: role.id,
          version: baseline.version,
          ...(fieldsDirty ? { fields } : {}),
          ...(keysDirty ? { permissions } : {}),
        },
        // Each saved step becomes the new baseline, so a failure in the
        // second keeps the first and the rest of the edits.
        onStep: (saved) => {
          setBaseline(baselineOf(saved));
        },
      },
      {
        onSuccess: () => {
          setConflict(false);
          toast.success(t("saved"));
        },
        onError,
      },
    );
  };

  const reload = async () => {
    setConflict(false);
    setMessage(undefined);
    setNameError(undefined);
    const fresh = await onReload();
    reset(baselineOf(fresh ?? role));
  };

  const disabledReason = (key: string) =>
    can(me, key) || baseline.permissions.has(key) ? undefined : t("notHeld");

  const title = creating ? tKind("newTitle") : role.name;

  return (
    <div className={cn("flex flex-col gap-6", dirty && "pb-24")}>
      <div className="flex flex-col gap-2">
        <Breadcrumb name={title} kind={kind} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-title font-semibold">{title}</h1>
          {!creating && !readOnly && (
            <Button
              type="button"
              variant="outline"
              className="text-negative"
              onClick={() => {
                setDeleting(true);
              }}
            >
              {tKind("delete")}
            </Button>
          )}
        </div>
      </div>

      {template && <TemplateNotice />}

      {conflict && (
        <ConflictBanner
          onReload={() => {
            void reload();
          }}
          changes={describeChanges(changes, {
            ...(name.trim() !== baseline.name ? { name: name.trim() } : {}),
            ...(description.trim() !== baseline.description
              ? { description: description.trim() }
              : {}),
          })}
        />
      )}

      <section
        aria-labelledby="role-details"
        className="flex flex-col gap-4 rounded-lg border border-border p-5"
      >
        <h2 id="role-details" className="text-section font-semibold">
          {t("details")}
        </h2>
        {readOnly && (
          <p className="flex items-center gap-2 rounded-md bg-pill-neutral px-3 py-2 text-body text-pill-neutral-ink">
            <Lock aria-hidden="true" className="size-4 shrink-0" />
            {t("systemReadOnly", { appName: brand.appName })}
          </p>
        )}
        {readOnly ? (
          <dl className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-small text-muted-foreground">{t("name")}</dt>
              <dd className="text-body">{baseline.name}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-small text-muted-foreground">
                {t("description")}
              </dt>
              <dd className="text-body">
                {baseline.description || (
                  <span className="text-muted-foreground">
                    {t("noDescription")}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor={nameId} className="text-body font-medium">
                {t("name")}
              </label>
              <Input
                id={nameId}
                value={name}
                maxLength={ROLE_NAME_MAX * 2}
                autoComplete="off"
                aria-invalid={nameError !== undefined}
                aria-describedby={nameError ? `${nameId}-error` : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(undefined);
                }}
              />
              {nameError && (
                <p id={`${nameId}-error`} className="text-small text-negative">
                  {nameError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={descriptionId} className="text-body font-medium">
                {t("description")}
                <span className="font-normal text-muted-foreground">
                  {t("optional")}
                </span>
              </label>
              <Input
                id={descriptionId}
                value={description}
                maxLength={ROLE_DESCRIPTION_MAX}
                autoComplete="off"
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
              />
            </div>
          </div>
        )}
      </section>

      <section
        aria-labelledby="role-permissions"
        className="flex flex-col gap-4 rounded-lg border border-border p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="role-permissions" className="text-section font-semibold">
            {t("permissions")}
          </h2>
          <div className="w-full sm:w-64">
            <label htmlFor={searchId} className="sr-only">
              {t("search")}
            </label>
            <Input
              id={searchId}
              type="search"
              value={search}
              placeholder={t("search")}
              autoComplete="off"
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />
          </div>
        </div>
        {visible.hidden > 0 && (
          <p aria-live="polite" className="text-small text-muted-foreground">
            {t("hidden", { count: visible.hidden })}
          </p>
        )}
        {groups.length === 0 ? (
          <p className="text-body text-muted-foreground">{t("noCatalog")}</p>
        ) : (
          <PermissionMatrix
            groups={visible.groups}
            selected={selected}
            onChange={setSelected}
            disabledReason={disabledReason}
            readOnly={readOnly}
          />
        )}
      </section>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background lg:start-sidebar">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <p aria-live="polite" className="text-body text-muted-foreground">
              {keysDirty
                ? t("changes", {
                    added: changes.added.length,
                    removed: changes.removed.length,
                  })
                : t("detailsChanged")}
            </p>
            {message && (
              <p role="alert" className="text-body text-negative">
                {message}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setConflict(false);
                  reset(baseline);
                }}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                disabled={pending}
                aria-busy={pending || undefined}
                onClick={onSave}
              >
                {creating ? tKind("create") : t("save")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <RuleDialog
        title={tKind("ruleTitle")}
        rule={rule}
        onClose={() => {
          setRule(undefined);
        }}
      />
      {role && template && deleting && (
        <ConfirmDialog
          open
          onOpenChange={(next) => {
            if (!next) {
              setDeleting(false);
            }
          }}
          destructive
          pending={deleteTemplate.isPending}
          title={tTemplate("deleteTitle", { name: role.name })}
          description={tTemplate("deleteBody")}
          confirmLabel={tKind("delete")}
          onConfirm={() => {
            deleteTemplate.mutate(role.id, {
              onSuccess: () => {
                setDeleting(false);
                setLeaving(true);
                toast.success(tTemplate("deleted", { name: role.name }));
                router.push(listPath);
              },
              onError: (error) => {
                setDeleting(false);
                errorToast(error);
              },
            });
          }}
        />
      )}
      {role && !template && (
        <DeleteRoleDialog
          role={deleting ? { id: role.id, name: role.name } : undefined}
          onClose={() => {
            setDeleting(false);
          }}
          onDeleted={() => {
            setLeaving(true);
            router.push(ROLES_PATH);
          }}
        />
      )}
    </div>
  );
}

/**
 * `/admin/roles/{id}`, or `/admin/roles/new` without an id. With
 * `kind="template"`, the same for `/admin/role-templates`.
 */
export function RoleEditor({
  id,
  kind = "role",
}: {
  id?: string;
  kind?: EditorKind;
}) {
  const t = useTranslations("adminRoles.editor");
  const tKind = useKindText(kind);
  const tenantRole = useRole(kind === "role" ? id : undefined);
  const template = useRoleTemplate(kind === "template" ? id : undefined);
  const role = kind === "template" ? template : tenantRole;
  const catalog = usePermissionCatalog();

  if ((id !== undefined && role.isPending) || catalog.isPending) {
    return <EditorSkeleton />;
  }
  // A template is read from the list, so a missing one is absent, not a 404.
  const missing =
    id !== undefined &&
    ((role.isError && isApiError(role.error) && role.error.status === 404) ||
      (role.isSuccess && role.data === undefined));
  if (missing) {
    return (
      <EmptyState
        icon={ShieldX}
        title={tKind("notFound")}
        action={
          <Button asChild variant="outline">
            <Link href={LIST_PATHS[kind]}>{tKind("backToRoles")}</Link>
          </Button>
        }
      />
    );
  }
  if (id !== undefined && role.isError) {
    return (
      <ErrorState
        title={tKind("loadFailed")}
        error={role.error}
        retrying={role.isFetching}
        onRetry={() => {
          void role.refetch();
        }}
      />
    );
  }
  if (catalog.isError) {
    return (
      <ErrorState
        title={t("catalogFailed")}
        error={catalog.error}
        retrying={catalog.isFetching}
        onRetry={() => {
          void catalog.refetch();
        }}
      />
    );
  }
  return (
    <Form
      // A different role is a different form.
      key={role.data?.id ?? "new"}
      kind={kind}
      role={id === undefined ? undefined : role.data}
      catalog={catalog.data}
      onReload={async () => (await role.refetch()).data}
    />
  );
}
