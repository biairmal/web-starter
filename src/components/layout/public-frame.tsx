import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/layout/wordmark";
import { brand } from "@/config/brand";

// The composition shared by every public screen and the error pages
// (DESIGN_BRIEF 5.1): the frame tint, a 400px column placed a little above
// centre, the wordmark, then the content; a support and legal footer at the
// bottom. No card, no shadow.

/** A legal link is shown only when brand.ts has a URL for it. */
const legal: { termsUrl: string; privacyUrl: string } = brand.legal;

export function PublicFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("publicFrame");
  return (
    <div className="flex min-h-dvh flex-col bg-frame px-4">
      <div aria-hidden="true" className="min-h-6 grow-38" />
      <main className="mx-auto flex w-full max-w-100 flex-col">
        <div className="mb-8">
          <Wordmark />
        </div>
        {children}
      </main>
      <div aria-hidden="true" className="min-h-8 grow-62" />
      <footer className="mx-auto flex w-full max-w-100 flex-wrap gap-x-4 gap-y-1 pb-8 text-small text-faint">
        <a
          href={`mailto:${brand.supportEmail}`}
          className="rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t("support", { email: brand.supportEmail })}
        </a>
        {legal.termsUrl && (
          <a
            href={legal.termsUrl}
            className="rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t("terms")}
          </a>
        )}
        {legal.privacyUrl && (
          <a
            href={legal.privacyUrl}
            className="rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t("privacy")}
          </a>
        )}
      </footer>
    </div>
  );
}

/**
 * One error page body (DESIGN_BRIEF 7.11): heading, one sentence, one primary
 * action, at most one secondary link. No illustration, no big status code.
 */
export function ErrorPageBody({
  title,
  body,
  primary,
  secondary,
  children,
}: {
  title: React.ReactNode;
  body: React.ReactNode;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  /** Extra detail under the sentence, such as a reference to quote. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-title font-semibold">{title}</h1>
      <p className="text-body text-muted-foreground">{body}</p>
      {children}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {primary}
        {secondary}
      </div>
    </div>
  );
}
