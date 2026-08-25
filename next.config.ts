import type { NextConfig } from "next";

// Baseline hardening applied to every response. (Strict CSP is intentionally
// deferred — Next's inline bootstrap needs nonces to do it right; tracked in README.)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // Pin the workspace root — there are other lockfiles higher up the tree
  // (home dir) and Next would otherwise guess wrong.
  turbopack: { root: import.meta.dirname },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The old print-style one-pagers moved to real pages; keep their URLs working.
  async redirects() {
    return [
      { source: "/brands-organizers.html", destination: "/for-brands", permanent: true },
      { source: "/good-company.html", destination: "/good-company", permanent: true },
      { source: "/privacy.html", destination: "/privacy", permanent: true },
      { source: "/terms.html", destination: "/terms", permanent: true },
    ];
  },
};

export default nextConfig;
