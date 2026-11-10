import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * The 403 state in place of the content (DESIGN_BRIEF 6.6, 7.11). It says what
 * the user cannot see and links to a page they can reach; the shell around it
 * stays usable. Works in Server and Client Components.
 */
export function ForbiddenState({
  title,
  description,
  homeHref = "/",
  className,
}: {
  title?: React.ReactNode;
  /** The permission needed, in plain words. */
  description?: React.ReactNode;
  homeHref?: string;
  className?: string;
}) {
  const t = useTranslations("forbidden");
  return (
    <div className={cn("flex max-w-md flex-col gap-2 py-12", className)}>
      <h1 className="text-title font-semibold">{title ?? t("title")}</h1>
      <p className="text-body text-muted-foreground">
        {description ?? t("body")}
      </p>
      <Link
        href={homeHref}
        className="mt-4 w-fit rounded-sm text-body text-brand-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {t("home")}
      </Link>
    </div>
  );
}
