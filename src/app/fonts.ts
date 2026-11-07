import localFont from "next/font/local";

// Inter Variable, self-hosted (DESIGN_BRIEF 4.2, TRD 4.2). No Google Fonts
// request, so no CSP exception. The font file and its OFL licence are in
// public/fonts/. Used through the --font-sans token in tokens.css.
export const interVariable = localFont({
  src: "../../public/fonts/InterVariable.woff2",
  variable: "--font-inter-variable",
  display: "swap",
  weight: "100 900",
});
