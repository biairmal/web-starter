import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { PasswordForm } from "@/features/account/password-form";
import { ProfileForm } from "@/features/account/profile-form";

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
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-semibold">{t("title")}</h1>
        <p className="text-body text-muted-foreground">{t("body")}</p>
      </div>
      <ProfileForm />
      <div className="border-t border-rule" />
      <PasswordForm />
    </div>
  );
}
