import type { Metadata } from "next";
import RequestPilotForm from "./RequestPilotForm";

// Public lead-capture page — override the layout's default noindex.
export const metadata: Metadata = {
  title: "Request a pilot · Campus Run",
  description:
    "Tell us about the activation. We'll find the fit and run one, low risk, so the numbers speak for themselves.",
  robots: { index: true, follow: true },
};

export default function RequestPilotPage() {
  return <RequestPilotForm />;
}
