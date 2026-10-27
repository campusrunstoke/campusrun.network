import type { Metadata } from "next";
import HomeLanding from "./HomeLanding";

// The marketing homepage IS public — override the layout's default noindex.
// NFC cards point at /stoked and /go directly, so nothing about capture changes;
// the stoke chart stays reachable at /stoke-chart.html.
export const metadata: Metadata = {
  title: "Campus Run — Prove your sampling day worked",
  description:
    "Measured Wallet Proof for campus and booth sampling: an NFC card on the table, a pass in Apple Wallet, tracked links, and a report of who tapped, added, kept it, and clicked. Pocari Sweat × LMU: 94 tapped, 65 added, 64 kept.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Campus Run — Measured Wallet Proof",
    description:
      "You already run the booth. We add the measurement and the report. Book a call.",
    type: "website",
  },
};

export default function Home() {
  return <HomeLanding />;
}
