import { getTranslations } from "next-intl/server";
import { USERS_READ } from "@/lib/authz/permissions";
import { requirePermission } from "@/lib/session/require-permission";

// Users list (FE-40). The permission gate is in place; the table comes with
// the admin users screen.
export default async function UsersPage() {
  await requirePermission(USERS_READ);
  const t = await getTranslations("nav.items");
  return <h1 className="text-title font-semibold">{t("users")}</h1>;
}
