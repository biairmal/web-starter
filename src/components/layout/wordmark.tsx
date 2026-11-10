import Link from "next/link";
import { brand } from "@/config/brand";

// The client's logo linking home (DESIGN_BRIEF 5.1, 5.2). Kept apart from the
// shell, so public pages that show it do not load the shell's code.

/** A client may leave the dark logo empty (brand.ts); the light one is used then. */
const darkLogo: string = brand.logo.dark;

export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- an SVG at its real size needs no optimisation */}
      <img
        src={brand.logo.light}
        alt={brand.appName}
        width={160}
        height={28}
        className="h-7 w-auto dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
      <img
        src={darkLogo || brand.logo.light}
        alt={brand.appName}
        width={160}
        height={28}
        className="hidden h-7 w-auto dark:block"
      />
    </Link>
  );
}
