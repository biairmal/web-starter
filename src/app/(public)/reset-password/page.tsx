import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

// The token is in the URL fragment (TRD 6.3); the page sends no referrer
// (also set as a header in next.config.ts).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword");
  return {
    title: `${t("metaTitle")} · ${brand.appName}`,
    referrer: "no-referrer",
  };
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
