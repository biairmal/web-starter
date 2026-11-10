import { getFormatter, getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { requireMe } from "@/lib/session/require-permission";

// The starter's home page (DESIGN_BRIEF 7.5): the app name, who is signed in
// where, and, in development only, a pointer to the file to replace.
export default async function HomePage() {
  const [me, t, format] = await Promise.all([
    requireMe(),
    getTranslations("home"),
    getFormatter(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-semibold">{brand.appName}</h1>
        <p className="text-body text-muted-foreground">
          {me.roles.length > 0
            ? t("signedInWithRoles", {
                tenant: me.tenant.name,
                roles: format.list(me.roles, { type: "conjunction" }),
              })
            : t("signedIn", { tenant: me.tenant.name })}
        </p>
      </div>
      {process.env.NODE_ENV !== "production" && (
        <div className="rounded-lg bg-raised p-5 text-body">
          <p className="font-medium">{t("starter.title")}</p>
          <p className="text-muted-foreground">
            {t.rich("starter.body", {
              code: (chunks) => <code className="font-mono">{chunks}</code>,
            })}
          </p>
        </div>
      )}
    </div>
  );
}
