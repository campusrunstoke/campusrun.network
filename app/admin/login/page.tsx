import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/session";
import { SiteNav, SiteFooter } from "../../SiteChrome";
import LoginForm from "./LoginForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Inherits the layout's noindex — an admin sign-in should never be findable.
export const metadata: Metadata = { title: "Sign in · Campus Run Ops" };

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");

  return (
    <>
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink">
      {/* Blurred blue backdrop — the same treatment as the homepage hero. */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/hero-activation.jpg"
          alt=""
          className="h-full w-full object-cover opacity-50"
          style={{
            objectPosition: "center 34%",
            filter: "blur(30px) saturate(1.15)",
            transform: "scale(1.2)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg,rgba(0,32,50,.94) 0%,rgba(0,32,50,.66) 52%,rgba(0,32,50,.42) 100%)",
          }}
        />
      </div>

      {/* The nav ribbon on top, so it reads as a normal site page. */}
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteNav />
        <div className="flex flex-1 items-center justify-center px-6 py-14">
          <LoginForm />
        </div>
      </div>
    </main>
      <SiteFooter tagline="stop guessing. get stoked" />
    </>
  );
}
