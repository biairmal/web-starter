import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import {
  SessionsList,
  SignOutEverywhere,
} from "@/features/account/sessions-list";
import { SignInMethods } from "@/features/account/sign-in-methods";
import { getAuthConfig } from "@/lib/session/me";
import { PageHeader } from "@/components/layout/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.security");
  return { title: `${t("title")} · ${brand.appName}` };
}

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// /account/security (TRD 6.1; FE-22, FE-33; DESIGN_BRIEF 7.6): sessions,
// sign-in methods, and sign out everywhere. `?linked=1` and `?error=` are the
// results of a Google link round trip (TRD 5.5).
export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [t, config, params] = await Promise.all([
    getTranslations("account.security"),
    getAuthConfig(),
    searchParams,
  ]);
  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader title={t("title")} description={t("body")} />
      <SessionsList />
      <div className="border-t border-rule" />
      <SignInMethods
        googleEnabled={config?.providers.google ?? false}
        linked={single(params.linked) === "1"}
        linkError={single(params.error)}
      />
      <div className="border-t border-rule" />
      <SignOutEverywhere />
    </div>
  );
}
