import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { interVariable } from "@/app/fonts";
import { brand } from "@/config/brand";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NONCE_HEADER } from "@/lib/security/csp";
import { themeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: brand.appName,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set by middleware on every page request. Reading it makes every page
  // render per request, which a per-request nonce needs.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={interVariable.variable}
      suppressHydrationWarning
    >
      <head>
        {/* Sets data-theme before first paint. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: themeInitScript(brand.defaultTheme),
          }}
        />
      </head>
      <body className="antialiased">
        {/* Inherits locale, messages and time zone from src/i18n/request.ts. */}
        <NextIntlClientProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
