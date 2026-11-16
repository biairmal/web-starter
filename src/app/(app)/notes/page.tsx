import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { NOTES_READ } from "@/lib/authz/permissions";
import { requirePermission } from "@/lib/session/require-permission";
import { NotesTable } from "@/features/notes/notes-table";
import { PageHeader } from "@/components/layout/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notes");
  return { title: `${t("title")} · ${brand.appName}` };
}

// /notes: the example business module (docs/adding-a-module.md). Needs
// notes:read; the notes service decides what else the user may do.
export default async function NotesPage() {
  await requirePermission(NOTES_READ);
  const t = await getTranslations("notes");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("body")} />
      <NotesTable />
    </div>
  );
}
