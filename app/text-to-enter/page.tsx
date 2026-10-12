import { permanentRedirect } from "next/navigation";

// The program page moved when text giveaways became text offers.
export default function TextToEnterMoved() {
  permanentRedirect("/text-offers");
}
