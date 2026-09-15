import type { Metadata } from "next";
import {
  PageHeader,
  Section,
  Callout,
  PointGrid,
  Steps,
  AskCard,
  SiteFooter,
} from "../SiteChrome";

export const metadata: Metadata = {
  title: "Good Company · a Campus Run format",
  description:
    "Sponsored lunches that fill a retirement home with college students for an afternoon. A brand picks up the tab and gets in the room. Everybody leaves stoked.",
  robots: { index: true, follow: true },
};

const WHO = [
  {
    head: "Seniors get company.",
    body: "The one thing people in a retirement home actually want is someone to talk to. A room full of college students for an hour is the whole point.",
  },
  {
    head: "Students get a cause.",
    body: "Greek life is always chasing volunteer hours and fundraising. This is a ready-made afternoon that counts, with lunch covered.",
  },
  {
    head: "The brand gets its people.",
    body: "A brand like Sweetgreen puts product straight into the hands of its exact customer, the on-campus student, tied to a genuinely good thing instead of a folding table in a hallway.",
  },
  {
    head: "Campus Run makes it go.",
    body: "We line up the sponsor, the chapter, the home, and the follow-up, so one call sets the whole thing in motion.",
  },
];

const STEPS = [
  { head: "A brand sponsors", body: "the lunch and brings its product for the day." },
  {
    head: "We bring a chapter",
    body: "that needs the volunteer and fundraising hours.",
  },
  {
    head: "Everyone meets",
    body: "at a local retirement home for an afternoon of food and conversation.",
  },
  {
    head: "The brand gets the story",
    body: "and the numbers: who came, who opted in, and what it drove.",
  },
];

export default function GoodCompanyPage() {
  return (
    <div>
      <PageHeader eyebrow="A Campus Run format" title="Good Company">
        <p className="max-w-[40em] text-[17px] leading-[1.6] sm:text-[18px]">
          Sponsored lunches that fill a retirement home with college students for an
          afternoon.{" "}
          <span className="font-semibold text-white">
            A brand picks up the tab and gets in the room. Everybody leaves stoked.
          </span>
        </p>
      </PageHeader>

      <main className="mx-auto w-full max-w-[860px] px-6 py-16 sm:px-8 sm:py-20">
        <Section label="The idea in one line">
          <Callout>
            A brand buys lunch, a sorority brings the energy, and a retirement home fills
            up with people for an afternoon.
          </Callout>
        </Section>

        <Section label="Who gets stoked">
          <PointGrid points={WHO} />
        </Section>

        <Section label="How one comes together">
          <Steps steps={STEPS} />
        </Section>

        <Section label="Why it works">
          <p className="text-[16px] leading-[1.7] text-muted">
            Anyone can buy a table at a career fair and hand out samples.{" "}
            <span className="font-semibold text-ink">
              Good Company is different because three groups walk away happy at the same
              time.
            </span>{" "}
            The seniors get company, the students get a cause, and the brand gets to be
            the reason it happened. That is worth more than a handout, and it is the part
            people remember. Everybody leaves with something, which is the whole point of
            stoke.
          </p>
        </Section>

        <div className="mt-14">
          <AskCard cta="Run one">
            <strong className="font-semibold text-white">Want to run one?</strong> A first
            Good Company is one brand, one chapter, one home, one afternoon. We handle the
            rest, and you see for yourself what a room like that feels like.
          </AskCard>
        </div>
      </main>

      <SiteFooter tagline="everybody leaves stoked" />
    </div>
  );
}
