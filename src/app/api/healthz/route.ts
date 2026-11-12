import { NextResponse } from "next/server";

// Liveness (TRD 14): the process is up and serving. It checks nothing else,
// so a slow identity never gets this replica restarted.

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  return NextResponse.json(
    { timestamp: new Date().toISOString(), data: { status: "ok" } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
