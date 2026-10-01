import type { Metadata } from "next";
import { PageHeader, Section, BulletList, SiteFooter } from "../SiteChrome";

export const metadata: Metadata = {
  title: "Privacy Policy · Campus Run",
  description: "How Campus Run handles the information you share with us.",
  robots: { index: true, follow: true },
};

const EMAIL = "kasey@campusrun.network";

export default function PrivacyPage() {
  return (
    <div>
      <PageHeader eyebrow="Legal" title="Privacy Policy">
        <p className="text-[16px] leading-[1.6] text-white/80">
          How Campus Run handles the information you share with us.
          <br />
          <span className="text-white/60">Last updated October 2026.</span>
        </p>
      </PageHeader>

      <main className="mx-auto w-full max-w-[760px] px-6 py-16 sm:px-8 sm:py-20">
        <Section label="Who we are">
          <p className="text-[16px] leading-[1.7] text-muted">
            Campus Run runs brand activations on college campuses and provides the
            attribution behind them. This policy explains what information we collect,
            how we use it, and the choices you have. Questions can go to{" "}
            <a href={`mailto:${EMAIL}`} className="font-medium text-ink underline">
              {EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section label="What we collect">
          <BulletList
            items={[
              <>
                <strong className="font-semibold">Information you give us.</strong> Your
                name, email, phone, and any details you enter on our forms (such as
                Request a pilot) or provide when you opt in at an activation.
              </>,
              <>
                <strong className="font-semibold">Activation data.</strong> Which event,
                code, or touchpoint you interacted with, so we can tie a physical moment
                to what it drove.
              </>,
              <>
                <strong className="font-semibold">Technical data.</strong> Standard log
                data such as IP address, browser and device information, and approximate
                location, used for security and basic analytics.
              </>,
            ]}
          />
        </Section>

        <Section label="How we use it">
          <p className="text-[16px] leading-[1.7] text-muted">
            We use your information to reply to you and run the activation you engaged
            with, to measure and improve how activations perform, and to keep the service
            secure.{" "}
            <span className="font-semibold text-ink">
              Opt-ins happen by your own action
            </span>{" "}
            — we don&rsquo;t add you to anything you didn&rsquo;t choose.
          </p>
        </Section>

        <Section label="How we share it">
          <p className="mb-4 text-[16px] leading-[1.7] text-muted">
            <span className="font-semibold text-ink">
              We do not sell your personal information.
            </span>{" "}
            We share it only with:
          </p>
          <BulletList
            items={[
              "The brand or partner running the activation you opted into.",
              "Service providers that help us operate — such as hosting and email delivery — under confidentiality obligations.",
              "Anyone we are required to share it with by law.",
            ]}
          />
        </Section>

        <Section label="Text messages (SMS)">
          <p className="mb-4 text-[16px] leading-[1.7] text-muted">
            If you text a keyword to a Campus Run number — for example, to enter a
            giveaway — we use your phone number and your replies only to run that
            promotion and to reply to you.
          </p>
          <BulletList
            items={[
              <>
                <strong className="font-semibold">
                  No mobile information will be shared with third parties or affiliates
                  for marketing or promotional purposes.
                </strong>{" "}
                Text messaging opt-in data and consent will not be shared with any third
                parties, except service providers that deliver our messages.
              </>,
              "Message and data rates may apply. Message frequency varies.",
              "Reply STOP at any time to stop receiving messages, or HELP for help.",
            ]}
          />
        </Section>

        <Section label="Your choices">
          <p className="text-[16px] leading-[1.7] text-muted">
            You can unsubscribe from our messages at any time. You can also request access
            to, correction of, or deletion of your information by emailing{" "}
            <a href={`mailto:${EMAIL}`} className="font-medium text-ink underline">
              {EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section label="Retention & security">
          <p className="text-[16px] leading-[1.7] text-muted">
            We keep information only as long as we need it for the purposes above, and we
            use reasonable measures to protect it. No method of storage or transmission is
            perfectly secure, but we work to keep your data safe.
          </p>
        </Section>

        <Section label="Changes to this policy">
          <p className="text-[16px] leading-[1.7] text-muted">
            We may update this policy from time to time. When we make a material change,
            we&rsquo;ll post the new version here with an updated date.
          </p>
        </Section>
      </main>

      <SiteFooter tagline="stop guessing. get stoked" />
    </div>
  );
}
