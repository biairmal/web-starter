import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ErrorPageBody, PublicFrame } from "@/components/layout/public-frame";
import { buttonVariants } from "@/components/ui/button";

// 404 for any unknown path, and for `notFound()` (DESIGN_BRIEF 7.11).
export default async function NotFound() {
  const t = await getTranslations("errorPages.notFound");
  return (
    <PublicFrame>
      <ErrorPageBody
        title={t("title")}
        body={t("body")}
        primary={
          <Link href="/" className={buttonVariants()}>
            {t("home")}
          </Link>
        }
      />
    </PublicFrame>
  );
}
