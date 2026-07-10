import type { Metadata } from "next";
import StokedForm from "./StokedForm";

export const metadata: Metadata = {
  title: "How stoked are you? · Campus Run",
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

// Server component: reads the attribution params off the URL and hands them to the
// client island. No DB work here → the page is static/instant on bad LTE.
export default async function StokedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  return <StokedForm e={first(sp.e)} b={first(sp.b)} c={first(sp.c)} />;
}
