import type { Metadata } from "next";
import HomeLanding from "./HomeLanding";

// The marketing homepage IS public — override the layout's default noindex.
// NFC cards point at /stoked and /go directly, so nothing about capture changes;
// the stoke chart stays reachable at /stoke-chart.html.
export const metadata: Metadata = {
  title: "Campus Run — We tell you where the product actually converted",
  description:
    "Campus Run runs brand activations on college campuses and ties each physical moment to what it drove. The activation is the surface; the attribution underneath is the product.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Campus Run — Attribution is the spine",
    description:
      "We tell you exactly where and when the product actually converted. Request a pilot.",
    type: "website",
  },
};

export default function Home() {
  return <HomeLanding />;
}
