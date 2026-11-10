import type { NextRequest } from "next/server";
import { guardRequest } from "@/lib/session/guard";

// Session check, single-flight refresh and route guards (TRD 5.3, 6.2). Runs
// on the Node runtime so it shares the in-process refresh lock with route
// handlers.

export default function middleware(request: NextRequest) {
  return guardRequest(request);
}

export const config = {
  runtime: "nodejs",
  // Everything except build assets and files with an extension (fonts,
  // brand images, favicon).
  matcher: ["/((?!_next/static|_next/image|.*\\.[A-Za-z0-9]+$).*)"],
};
