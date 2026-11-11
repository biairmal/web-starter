import { bffPost } from "@/lib/api/bff-fetch";
import type { NextResult } from "@/lib/api/bff-types";
import { hardNavigate } from "@/lib/hard-navigate";
import { postSessionMessage } from "@/lib/session-channel";

// Moving the session to another tenant in the browser (TRD 5.8, APP_FLOW
// 5.10): the BFF replaces the cookies, the other tabs are told, and `/` loads
// in full, so nothing cached from the old tenant stays in memory.

export const SWITCH_TENANT_PATH = "/api/auth/switch-tenant";

/**
 * Switches the session to `tenantId` and reloads into it. Resolves once the
 * reload has started; rejects with the `ApiError` identity answered, such as
 * TENANT_SUSPENDED or NOT_A_MEMBER.
 */
export async function switchTenant(tenantId: string): Promise<void> {
  const result = await bffPost<NextResult>(SWITCH_TENANT_PATH, {
    tenant_id: tenantId,
  });
  postSessionMessage({ type: "tenant-switched" });
  hardNavigate(result.next);
}
