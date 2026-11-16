import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ComponentGallery } from "@/dev/gallery/gallery";

// Development only: a production build answers 404 here. Not in the nav.
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Components"
        description="Every shared component in its variants and states. Development only."
      />
      <ComponentGallery />
    </div>
  );
}
