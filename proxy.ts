import { NextRequest, NextResponse } from "next/server";

// HTTP Basic auth gate for /admin and /api/export.
// v1 auth: a shared credential over HTTPS. Upgrade path: real sessions / SSO.

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="campusrun-admin", charset="UTF-8"',
    },
  });
}

export function proxy(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;

  // Fail closed if the gate isn't configured.
  if (!user || !pass) return unauthorized();

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }

  const sep = decoded.indexOf(":");
  const u = sep === -1 ? decoded : decoded.slice(0, sep);
  const p = sep === -1 ? "" : decoded.slice(sep + 1);

  if (u !== user || p !== pass) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/export/:path*"],
};
