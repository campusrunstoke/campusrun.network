import type { Metadata } from "next";
import { SiteFooter } from "../SiteChrome";
import RequestPilotForm from "./RequestPilotForm";

// Public lead-capture page — override the layout's default noindex.
export const metadata: Metadata = {
  title: "Book a call · Campus Run",
  description:
    "Tell us about your next sampling day: who you are, who staffs the booth, what you tracked last time, whether a store will scan. Kasey emails back within two business days to set up a call.",
  robots: { index: true, follow: true },
};

export default function RequestPilotPage() {
  return (
    <>
      <RequestPilotForm />
      <SiteFooter tagline="stop guessing. get stoked" />
    </>
  );
}
