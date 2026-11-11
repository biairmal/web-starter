import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { getAuthConfig } from "@/lib/session/me";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signUp");
  return { title: `${t("metaTitle")} · ${brand.appName}` };
}

// /sign-up (TRD 6.1, FE-4): 404 while registration is closed (invite-only),
// and while identity cannot say whether it is open.
export default async function SignUpPage() {
  const config = await getAuthConfig();
  if (!config?.registration) {
    notFound();
  }
  return <SignUpForm initialConfig={config} />;
}
