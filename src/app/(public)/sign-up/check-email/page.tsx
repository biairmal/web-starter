import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { CheckEmail } from "@/features/auth/check-email";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.checkEmail");
  return { title: `${t("title")} · ${brand.appName}` };
}

export default function CheckEmailPage() {
  return <CheckEmail />;
}
