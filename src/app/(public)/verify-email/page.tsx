import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { VerifyEmail } from "@/features/auth/verify-email";

// The token is in the URL fragment (TRD 6.3); the page sends no referrer
// (also set as a header in next.config.ts).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verifyEmail");
  return {
    title: `${t("metaTitle")} · ${brand.appName}`,
    referrer: "no-referrer",
  };
}

export default function VerifyEmailPage() {
  return <VerifyEmail />;
}
