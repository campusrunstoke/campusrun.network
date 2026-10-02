import { redirect } from "next/navigation";

// Wallet campaigns are the home screen. Ratings & taps moved to /admin/submissions.
export default function AdminHome() {
  redirect("/admin/wallet");
}
