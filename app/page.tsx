import { redirect } from "next/navigation";

// Cards point at /stoked and /go directly, so they are unaffected by this.
// A bare domain hit lands on the stoke chart.
export default function Home() {
  redirect("/stoke-chart.html");
}
