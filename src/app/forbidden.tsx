import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ErrorPageBody, PublicFrame } from "@/components/layout/public-frame";
import { buttonVariants } from "@/components/ui/button";

// 403 outside the signed-in shell, for `forbidden()` in any segment that has
// no closer forbidden.tsx, such as /forbidden (DESIGN_BRIEF 7.11). Inside the
// shell, (app)/forbidden.tsx keeps the navigation.
export default async function Forbidden() {
  const t = await getTranslations("forbidden");
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
