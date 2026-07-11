import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/session";
import LoginForm from "./LoginForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in · Campus Run Ops" };

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  return <LoginForm />;
}
