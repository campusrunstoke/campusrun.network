import { redirect } from "next/navigation";

// Cards point at /stoked. A bare domain hit lands there too (params just come back null).
export default function Home() {
  redirect("/stoked");
}
