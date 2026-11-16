import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { PasswordForm } from "@/features/account/password-form";
import { ProfileForm } from "@/features/account/profile-form";
import { PageHeader } from "@/components/layout/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: `${t("title")} · ${brand.appName}` };
}

// /account (TRD 6.1; FE-32; DESIGN_BRIEF 7.6): the profile and the password.
// The (app) layout has already loaded the signed-in user.
export default async function AccountPage() {
  const t = await getTranslations("account");
  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader title={t("title")} description={t("body")} />
      <ProfileForm />
      <div className="border-t border-rule" />
      <PasswordForm />
    </div>
  );
}
