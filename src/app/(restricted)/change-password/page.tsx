import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { readSessionCookies } from "@/lib/session/cookies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.changePassword");
  return { title: `${t("title")} · ${brand.appName}` };
}

/** Where a signed-in user changes their password by choice (TRD 6.1). */
const ACCOUNT_PATH = "/account";

// /change-password (TRD 6.1, 5.7; FE-7). Middleware lets only the restricted
// cookie or a signed-in user reach it; a signed-in user without a forced
// change goes to the account page.
export default async function ChangePasswordPage() {
  const { restricted, refresh } = await readSessionCookies(await cookies());
  if (!restricted && refresh) {
    redirect(ACCOUNT_PATH);
  }
  return <ChangePasswordForm />;
}
