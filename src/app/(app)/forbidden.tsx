import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Rendered with status 403 when a page calls `forbidden()` (requirePermission).
// It sits inside the shell, so the navigation stays usable (DESIGN_BRIEF 6.6).
export default async function Forbidden() {
  const t = await getTranslations("forbidden");
  return (
    <div className="flex max-w-md flex-col gap-2 py-12">
      <h1 className="text-title font-semibold">{t("title")}</h1>
      <p className="text-body text-muted-foreground">{t("body")}</p>
      <Link
        href="/"
        className="mt-4 w-fit text-body text-brand-accent underline-offset-4 hover:underline"
      >
        {t("home")}
      </Link>
    </div>
  );
}
