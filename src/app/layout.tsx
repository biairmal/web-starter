import type { Metadata } from "next";
import "./globals.css";
import { interVariable } from "@/app/fonts";
import { brand } from "@/config/brand";
import { TooltipProvider } from "@/components/ui/tooltip";
import { themeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: brand.appName,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={interVariable.variable} suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint. Gets a CSP nonce in F1.5. */}
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitScript(brand.defaultTheme),
          }}
        />
      </head>
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
