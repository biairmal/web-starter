import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { TenantPicker } from "@/features/auth/tenant-picker";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.tenantPicker");
  return { title: `${t("title")} · ${brand.appName}` };
}

// /sign-in/tenant (FE-8): the choice is held in browser memory only.
export default function TenantPickerPage() {
  return <TenantPicker />;
}
