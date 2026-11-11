import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { AcceptInvite } from "@/features/auth/accept-invite-form";
import { getCurrentMe } from "@/lib/session/me";

// The token is in the URL fragment (TRD 6.3); the page sends no referrer
// (also set as a header in next.config.ts).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.invite");
  return {
    title: `${t("metaTitle")} · ${brand.appName}`,
    referrer: "no-referrer",
  };
}

// /invite#token=… (TRD 6.1, FE-9). A browser already signed in is asked to
// sign out first, since the invite may be for someone else (APP_FLOW 5.7).
export default async function InvitePage() {
  const me = await getCurrentMe();
  return <AcceptInvite signedInAs={me?.display_name ?? null} />;
}
