import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type SearchParams, param } from "@/lib/search-params";
import { brand } from "@/config/brand";
import { SignInForm } from "@/features/auth/sign-in-form";
import { getAuthConfig } from "@/lib/session/me";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: `${t("metaTitle")} · ${brand.appName}` };
}

// /sign-in (TRD 6.1): `next` is where to return after signing in (the BFF
// keeps it only when it is a same-origin path); `reason` explains why the
// user is here.
export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const config = await getAuthConfig();
  return (
    <SignInForm
      next={param(params, "next") ?? "/"}
      reason={param(params, "reason")}
      initialConfig={config}
    />
  );
}
