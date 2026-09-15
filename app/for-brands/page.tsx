import type { Metadata } from "next";
import {
  PageHeader,
  Section,
  Callout,
  PointGrid,
  Steps,
  BulletList,
  AskCard,
  SiteFooter,
} from "../SiteChrome";

export const metadata: Metadata = {
  title: "For brands & event organizers · Campus Run",
  description:
    "Campus Run turns live events into measured, opted-in audiences — it grows an opted-in list on the spot and proves what the event actually drove.",
  robots: { index: true, follow: true },
};

const WHY = [
  {
    head: "Live events become list growth.",
    body: "People join the list from their own phone right when they're most engaged, in a single step. Far less friction than a paper card or a form, so far more people actually join.",
  },
  {
    head: "You learn what worked, that night.",
    body: "A code unique to each event ties the physical moment to what happens next, so you stop guessing at what an event drove.",
  },
  {
    head: "The list is yours, and everyone opted in.",
    body: "Every contact joined by their own hand. That's a clean, consent-first list you own, which beats anything scraped or rented on deliverability and on reputation.",
  },
  {
    head: "One team, tech and boots.",
    body: "The same shop builds the software and staffs the event, so the data layer and the people handing out product are never two vendors pointing at each other.",
  },
];

const STEPS = [
  {
    head: "Capture.",
    body: "A quick touchpoint at any table, booth, or handout gets someone onto the list from their own phone in one step.",
  },
  {
    head: "Opt in.",
    body: "They join the list and answer a question or two, with a quick A/B test if you want it.",
  },
  {
    head: "Watch live.",
    body: "Signups, answers, and the best-performing spots stream to a dashboard during the event.",
  },
  {
    head: "Attribute.",
    body: "A per-event code shows what the moment drove in the days after, in real numbers.",
  },
];

export default function ForBrandsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="For brands & event organizers"
        title="Campus Run turns live events into measured, opted-in audiences."
      >
        <p className="max-w-[40em] text-[17px] leading-[1.6] sm:text-[18px]">
          For the brands sampling at your event and the organizers running it, it
          grows an opted-in list on the spot and proves what the event actually drove.
        </p>
      </PageHeader>

      <main className="mx-auto w-full max-w-[860px] px-6 py-16 sm:px-8 sm:py-20">
        <Section label="The one sentence">
          <Callout>
            Every giveaway, booth, or connect moment at a live event becomes a tracked
            touchpoint, so you grow an opted-in list on the spot and see what actually
            worked that night instead of hoping.
          </Callout>
        </Section>

        <Section label="Why it works">
          <PointGrid points={WHY} />
        </Section>

        <Section label="How it works">
          <Steps steps={STEPS} />
        </Section>

        <div className="mt-14 grid grid-cols-1 gap-x-12 gap-y-12 sm:grid-cols-2">
          <Section label="Where it fits your events">
            <BulletList
              items={[
                <>
                  <strong className="font-semibold">Conferences and trade shows.</strong>{" "}
                  Capture and measure the room in real time, and hand sponsors the
                  numbers the same night.
                </>,
                <>
                  <strong className="font-semibold">Festivals and campus events.</strong>{" "}
                  More opt-ins per hour than a folding table, with the follow-up list to
                  match.
                </>,
                <>
                  <strong className="font-semibold">
                    Sampling and product launches.
                  </strong>{" "}
                  Turn a giveaway into a lasting, opted-in relationship, and prove the
                  reach.
                </>,
              ]}
            />
          </Section>

          <Section label="Proof it's real">
            <BulletList
              items={[
                "Piloting at a 3,000-person festival this summer, capturing the gate line with live surveys.",
                "Partnered with a Mark Cuban backed startup for a fall campus launch, about 4,000 units across two weeks.",
                "Real-time dashboard and consent-first capture already built and running.",
              ]}
            />
          </Section>
        </div>

        <div className="mt-14">
          <AskCard>
            <strong className="font-semibold text-white">
              If you want to go further:
            </strong>{" "}
            a short call to find the fit, and if it clicks, a low-risk pilot at one event
            so the numbers speak for themselves. No big commitment to see it work once.
          </AskCard>
        </div>
      </main>

      <SiteFooter tagline="stop guessing. get stoked" />
    </div>
  );
}
