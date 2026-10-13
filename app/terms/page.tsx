import type { Metadata } from "next";
import { PageHeader, Section, SiteFooter } from "../SiteChrome";

export const metadata: Metadata = {
  title: "Terms of Use · Campus Run",
  description: "The terms that govern your use of campusrun.network.",
  robots: { index: true, follow: true },
};

const EMAIL = "kasey@campusrun.network";

export default function TermsPage() {
  return (
    <div>
      <PageHeader eyebrow="Legal" title="Terms of Use">
        <p className="text-[16px] leading-[1.6] text-white/80">
          The terms that govern your use of campusrun.network.
          <br />
          <span className="text-white/60">Last updated October 2026.</span>
        </p>
      </PageHeader>

      <main className="mx-auto w-full max-w-[760px] px-6 py-16 sm:px-8 sm:py-20">
        <Section label="The basics">
          <p className="text-[16px] leading-[1.7] text-muted">
            By using campusrun.network and Campus Run&rsquo;s services, you agree to these
            terms. If you don&rsquo;t agree with them, please don&rsquo;t use the site.
          </p>
        </Section>

        <Section label="Using the service">
          <p className="text-[16px] leading-[1.7] text-muted">
            Use the site lawfully and don&rsquo;t misuse it — that includes disrupting it,
            probing its security, or trying to access areas you aren&rsquo;t authorized
            to, such as the admin console.
          </p>
        </Section>

        <Section label="Activations & pilots">
          <p className="text-[16px] leading-[1.7] text-muted">
            The specifics of any activation or pilot — scope, deliverables, and pricing —
            are set out in a separate written agreement between you and Campus Run. These
            terms cover general use of the site itself.
          </p>
        </Section>

        <Section label="Text messages">
          <div className="space-y-4 text-[16px] leading-[1.7] text-muted">
            <p>
              At some activations you can opt in to a brand&rsquo;s texts from Campus Run —
              by ticking an unticked box on the brand&rsquo;s page, or by texting the
              brand&rsquo;s keyword to a Campus Run number. We only text people who have
              opted in one of these two ways, and opting in is never required for anything
              else. There are no prizes, contests or purchases.
            </p>
            <p>
              After you opt in, you&rsquo;ll get a short conversation of up to 3 messages
              (each after you reply), then occasional news and updates about that brand —
              up to 4 messages a month. Details:{" "}
              <a href="/text-offers" className="font-medium text-ink underline">Campus Run Texts</a>.
            </p>
            <p>
              Message and data rates may apply. Message frequency varies. Reply{" "}
              <span className="font-semibold text-ink">STOP</span> to opt out at any time,
              or <span className="font-semibold text-ink">HELP</span> for help. You can
              also email{" "}
              <a href={`mailto:${EMAIL}`} className="font-medium text-ink underline">
                {EMAIL}
              </a>
              . Carriers are not liable for delayed or undelivered messages. See our{" "}
              <a href="/privacy" className="font-medium text-ink underline">
                Privacy Policy
              </a>{" "}
              for how we handle your number.
            </p>
          </div>
        </Section>

        <Section label="Your information">
          <p className="text-[16px] leading-[1.7] text-muted">
            Information you submit is handled under our{" "}
            <a href="/privacy" className="font-medium text-ink underline">
              Privacy Policy
            </a>
            . You&rsquo;re responsible for the accuracy of what you provide.
          </p>
        </Section>

        <Section label="Intellectual property">
          <p className="text-[16px] leading-[1.7] text-muted">
            The site, the Campus Run name, and its content belong to Campus Run. Please
            don&rsquo;t copy, reuse, or redistribute them without our permission.
          </p>
        </Section>

        <Section label="Disclaimer & liability">
          <p className="text-[16px] leading-[1.7] text-muted">
            The site is provided &ldquo;as is,&rdquo; without warranties of any kind. To
            the fullest extent permitted by law, Campus Run isn&rsquo;t liable for
            indirect, incidental, or consequential damages arising from your use of it.
          </p>
        </Section>

        <Section label="Changes to these terms">
          <p className="text-[16px] leading-[1.7] text-muted">
            We may update these terms from time to time. Continued use of the site after a
            change means you accept the updated terms. Questions? Email{" "}
            <a href={`mailto:${EMAIL}`} className="font-medium text-ink underline">
              {EMAIL}
            </a>
            .
          </p>
        </Section>
      </main>

      <SiteFooter tagline="stop guessing. get stoked" />
    </div>
  );
}
