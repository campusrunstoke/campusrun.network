import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Apple's diagnostic log sink. iOS POSTs pass-related errors here (e.g. a device that
 * couldn't reach the web service). POST /v1/log — body {logs: string[]}. We just record
 * them; never trust or act on the contents.
 */
export async function POST(req: NextRequest) {
  try {
    const { logs } = (await req.json()) as { logs?: string[] };
    if (Array.isArray(logs) && logs.length) {
      console.warn("[wallet][apple-log]", logs.slice(0, 20).join(" | ").slice(0, 2000));
    }
  } catch {
    /* ignore malformed bodies */
  }
  return NextResponse.json({ ok: true });
}
