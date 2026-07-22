import type { Metadata } from "next";
import IntakeForm from "./IntakeForm";

export const metadata: Metadata = {
  title: "Work with us · Campus Run",
  description: "Tell us about your brand and we'll come back with a plan.",
  // Inherits robots noindex from the root layout — flip to
  // `robots: { index: true, follow: true }` here when this page should be findable.
};

// No DB work, no params: the page is static and loads instantly.
export default function WorkWithUsPage() {
  return <IntakeForm />;
}
