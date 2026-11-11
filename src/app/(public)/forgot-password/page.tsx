import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgotPassword");
  return { title: `${t("title")} · ${brand.appName}` };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
