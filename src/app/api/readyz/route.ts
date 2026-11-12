import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { BffError, errorBody } from "@/lib/bff/envelope";

// Readiness (TRD 14): this replica takes traffic only while identity's own
// /readyz answers 2xx within one second. Every page and BFF route needs
// identity, so a replica that cannot reach it should be taken out of the
// load balancer rather than serve errors.

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 1000;
const NO_STORE = { "Cache-Control": "no-store" };

async function identityReady(): Promise<boolean> {
  try {
    const response = await fetch(
      `${env.IDENTITY_INTERNAL_URL.replace(/\/$/, "")}/readyz`,
      { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  }
}

export async function GET(): Promise<NextResponse> {
  if (await identityReady()) {
    return NextResponse.json(
      { timestamp: new Date().toISOString(), data: { status: "ready" } },
      { headers: NO_STORE },
    );
  }
  const error = BffError.upstreamUnavailable();
  return NextResponse.json(errorBody(error), {
    status: error.status,
    headers: NO_STORE,
  });
}
