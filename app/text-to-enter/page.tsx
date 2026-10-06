import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smsPrograms } from "@/lib/db/schema";
import { PageHeader, Section, BulletList, SiteFooter } from "../SiteChrome";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Text to Enter · Campus Run",
  description: "How Campus Run's text-to-enter giveaways work: how you opt in, what we send, and how to stop.",
  robots: { index: true, follow: true },
};

const EMAIL = "kasey@campusrun.network";

/** "+18558517300" → "(855) 851-7300" */
const pretty = (e164: string | undefined) => {
  const d = e164?.replace(/\D/g, "").replace(/^1/, "");
  return d && d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : null;
};

/**
 * The public description of our text program — what carriers' toll-free verification
 * reviewers look for: how someone opts in (they text us first), what and how often we
 * send, rates, STOP/HELP, and links to terms and privacy. The "#opt-in" figure doubles as
 * the opt-in proof image submitted with the verification.
 */
export default async function TextToEnterPage() {
  const programs = await db
    .select({ name: smsPrograms.name, keyword: smsPrograms.keyword })
    .from(smsPrograms)
    .where(eq(smsPrograms.open, true))
    .orderBy(desc(smsPrograms.createdAt))
    .catch(() => []);
  const number = pretty(process.env.TWILIO_PHONE_NUMBER);
  const example = programs[0]?.keyword ?? "POCARI";

  return (
    <div>
      <PageHeader eyebrow="Text programs" title="Text to Enter">
        <p className="text-[16px] leading-[1.6] text-white/80">
          How Campus Run&rsquo;s text-to-enter giveaways work at campus brand activations.
        </p>
      </PageHeader>

      <main className="mx-auto w-full max-w-[760px] px-6 py-16 sm:px-8 sm:py-20">
        <Section label="How you opt in">
          <p className="mb-6 text-[16px] leading-[1.7] text-muted">
            At an activation, you scan a card and add the brand&rsquo;s pass to your phone. To enter its giveaway,
            you tap the pass&rsquo;s button: your texting app opens with the giveaway keyword already typed, addressed to
            our number{number ? ` (${number})` : ""}. <span className="font-semibold text-ink">Nothing is sent until you
            press send yourself</span> — that text is your entry and your opt-in. We never text anyone who hasn&rsquo;t
            texted us first.
          </p>

          {/* Opt-in proof: the three screens, with the disclosure shown beside the button. */}
          <figure id="opt-in" className="rounded-3xl border border-line bg-fill p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Phone step="1" caption="Tap the giveaway button on the pass">
                <div className="rounded-xl bg-[#1f92ff] p-3 text-white">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Pocari Sweat</div>
                  <div className="mt-1 text-[17px] font-bold leading-tight">ENTER TO WIN</div>
                </div>
                <div className="mt-2 rounded-lg bg-white px-2.5 py-2 text-[11px] font-medium text-black shadow-sm">
                  View Offers and Rewards ›
                </div>
                <p className="mt-2 text-[9.5px] leading-snug text-muted">
                  Entering by text: Msg &amp; data rates may apply. Up to 3 msgs per entry. Reply STOP to opt out, HELP
                  for help. Terms &amp; privacy: campusrun.network/terms
                </p>
              </Phone>
              <Phone step="2" caption="Your texting app opens — you press send">
                <div className="text-center text-[10px] text-muted">To: {number ?? "Campus Run"}</div>
                <div className="mt-16 flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5">
                  <span className="flex-1 text-[12px] text-black">{example} #7A2F9C</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0a84ff] text-[11px] text-white">↑</span>
                </div>
              </Phone>
              <Phone step="3" caption="We confirm your entry">
                <div className="flex justify-end">
                  <span className="rounded-2xl bg-[#0a84ff] px-2.5 py-1.5 text-[11px] text-white">{example} #7A2F9C</span>
                </div>
                <div className="mt-2 flex">
                  <span className="rounded-2xl bg-white px-2.5 py-1.5 text-[11px] leading-snug text-black">
                    Campus Run x Pocari Sweat: you&rsquo;re in! quick q: ever heard of pocari sweat? text back anything.
                    Msg&amp;data rates may apply. STOP to opt out
                  </span>
                </div>
              </Phone>
            </div>
            <figcaption className="mt-4 text-center text-[12px] text-muted">
              Opt-in flow for Campus Run text-to-enter giveaways · campusrun.network/text-to-enter
            </figcaption>
          </figure>
        </Section>

        <Section label="What we send">
          <BulletList
            items={[
              "A confirmation that you're entered, with one optional question — any reply counts, and answering doesn't change your odds.",
              "A thank-you after your first reply. Then we stop.",
              "A message to the winner when the giveaway is drawn.",
              "Up to 3 messages per entry. Message frequency varies. Message and data rates may apply.",
              "No marketing messages, and we never share or sell your number — see our privacy policy.",
            ]}
          />
        </Section>

        <Section label="Stop or get help">
          <p className="text-[16px] leading-[1.7] text-muted">
            Reply <span className="font-semibold text-ink">STOP</span> at any time and we&rsquo;ll never text you again.
            Reply <span className="font-semibold text-ink">HELP</span> for help, or email{" "}
            <a href={`mailto:${EMAIL}`} className="font-medium text-ink underline">{EMAIL}</a>. Carriers are not liable for
            delayed or undelivered messages. Full details are in our{" "}
            <a href="/terms" className="font-medium text-ink underline">Terms</a> and{" "}
            <a href="/privacy" className="font-medium text-ink underline">Privacy Policy</a>.
          </p>
        </Section>

        {programs.length > 0 && (
          <Section label="Giveaways open now">
            <BulletList
              items={programs.map((p) => (
                <>
                  <span className="font-semibold text-ink">{p.name}</span> — text{" "}
                  <span className="font-mono font-semibold text-ink">{p.keyword}</span>
                  {number ? ` to ${number}` : ""}
                </>
              ))}
            />
          </Section>
        )}
      </main>

      <SiteFooter tagline="stop guessing. get stoked" />
    </div>
  );
}

function Phone({ step, caption, children }: { step: string; caption: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mx-auto flex aspect-[9/16] max-w-[200px] flex-col rounded-[26px] border-[5px] border-ink bg-[#f2f2f7] p-3">
        {children}
      </div>
      <p className="mt-2 text-center text-[13px] font-medium text-ink">
        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">{step}</span>
        {caption}
      </p>
    </div>
  );
}
