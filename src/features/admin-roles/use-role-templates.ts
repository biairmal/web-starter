"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { queryKeys, staleTimes } from "@/lib/api/query-keys";
import type { RoleTemplate } from "@/lib/api/types";
import { ifMatch } from "@/features/admin-roles/use-roles";

// Data for the super admin's role templates (FE-52; BE TRD 9.7): the roles
// copied into each new tenant. Identity lists them all at once and has no
// single-template read, so one template comes from the list.

export const ROLE_TEMPLATES_PATH = "/admin/role-templates";

export function roleTemplatePath(template: Pick<RoleTemplate, "id">): string {
  return `${ROLE_TEMPLATES_PATH}/${encodeURIComponent(template.id)}`;
}

function listTemplates() {
  return unwrap(api.GET("/admin/role-templates"));
}

/** `GET /v1/admin/role-templates`: every template. */
export function useRoleTemplates() {
  return useQuery({
    queryKey: queryKeys.admin.roleTemplates.all,
    queryFn: listTemplates,
    staleTime: staleTimes.adminRoleTemplates,
  });
}

/**
 * One template, read from the list. Its `data` is `undefined` once the list
 * has loaded without it.
 */
export function useRoleTemplate(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.roleTemplates.all,
    queryFn: listTemplates,
    staleTime: staleTimes.adminRoleTemplates,
    enabled: id !== undefined,
    select: (templates) => templates.find((template) => template.id === id),
  });
}

function useInvalidateTemplates() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.roleTemplates.all,
    });
}

export type TemplateValues = {
  name: string;
  description?: string;
  permissions?: string[];
};

/** `POST /v1/admin/role-templates`. */
export function useCreateRoleTemplate() {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: (values: TemplateValues) =>
      unwrap(api.POST("/admin/role-templates", { body: values })),
    onSuccess: () => invalidate(),
  });
}

export type TemplateEdits = {
  id: string;
  version: number;
  /** Only what changed; the keys as the full list. */
  changes: TemplateValues | Partial<TemplateValues>;
};

/**
 * `PATCH /v1/admin/role-templates/{id}` with `If-Match`: name, description
 * and keys in one request. Tenants created later get the new version.
 */
export function useSaveRoleTemplate() {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: ({ id, version, changes }: TemplateEdits) =>
      unwrap(
        api.PATCH("/admin/role-templates/{id}", {
          params: { path: { id }, header: { "If-Match": ifMatch(version) } },
          body: changes,
        }),
      ),
    onSuccess: () => invalidate(),
  });
}

/** `DELETE /v1/admin/role-templates/{id}`. Existing tenants keep their copy. */
export function useDeleteRoleTemplate() {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.DELETE("/admin/role-templates/{id}", {
          params: { path: { id } },
        }),
      ),
    onSuccess: () => invalidate(),
  });
}
