import type { Metadata } from "next";
import Link from "next/link";
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

// Same offer as the homepage: Measured Wallet Proof for teams that already staff
// the sampling. The only proof on this page is Pocari Sweat × LMU, Oct 14 2026;
// numbers come from the Campus Run activation report (data through Oct 21 2026).
export const metadata: Metadata = {
  title: "For brands, agencies & field teams · Campus Run",
  description:
    "Measured Wallet Proof for teams that already staff campus and booth sampling: an NFC card on the table, a pass in Apple Wallet, tracked links, and a report of who tapped, added, kept it, and clicked.",
  robots: { index: true, follow: true },
};

const WHY = [
  {
    head: "The tap is the record.",
    body: "One NFC card on the table. A phone taps it and lands on a URL unique to that card, and the tap is logged with the card, the time and the phone type. No clipboard, no form, nothing for your staff to type.",
  },
  {
    head: "Apple confirms the add.",
    body: "When someone adds the pass to Wallet, Apple's servers tell us. When they remove it, Apple tells us that too. Still in Wallet is a count, not a survey answer.",
  },
  {
    head: "Every link is counted by name.",
    body: "Shop, where to buy, Instagram, the brand's site: each link on the pass runs through a tracked redirect before it lands, so you see clicks per link instead of one blended number.",
  },
  {
    head: "The report is the deliverable.",
    body: "Totals first, then the funnel: tapped, added, kept, clicked, and redeemed when a store scans. Taps across the day show the booth's peak. It prints, and the raw events export to CSV.",
  },
];

const STEPS = [
  {
    head: "Tap.",
    body: "A card sits on your table next to the product. The person taps it with their phone and lands on a URL unique to that card. The tap is counted, with the time and whether it was an iPhone.",
  },
  {
    head: "Add.",
    body: "An iPhone gets a pass in Apple Wallet, in the brand's colours and artwork. Android gets a web page with the same links. Apple confirms each add.",
  },
  {
    head: "Keep and click.",
    body: "The pass stays in Wallet after the day, and every link on it is tracked. A click a week later still ties back to the table.",
  },
  {
    head: "Report.",
    body: "After the day you get the funnel: who tapped, who added, who kept it, who clicked, by link. If a store scans the pass's barcode at the register, redemptions join it.",
  },
];

export default function ForBrandsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="For brands, agencies & field teams"
        title="You already staff the booth. We prove the day worked."
      >
        <p className="max-w-[40em] text-[17px] leading-[1.6] sm:text-[18px]">
          For brand, agency and field teams that already run campus and booth
          sampling. An NFC card goes on the table, a tap puts a pass in Apple
          Wallet, the links on it are tracked, and afterwards you get a report of
          who tapped, who added, who kept it and who clicked.
        </p>
      </PageHeader>

      <main className="mx-auto w-full max-w-[860px] px-6 py-16 sm:px-8 sm:py-20">
        <Section label="The one sentence">
          <Callout>
            Every sample handed over your table can become a tap, a pass in Apple
            Wallet and a click, each one counted, so the day ends with a report
            instead of a guess.
          </Callout>
        </Section>

        <Section label="Why it works">
          <PointGrid points={WHY} />
        </Section>

        <Section label="How it works">
          <Steps steps={STEPS} />
        </Section>

        <div className="mt-14 grid grid-cols-1 gap-x-12 gap-y-12 sm:grid-cols-2">
          <Section label="Where it fits">
            <BulletList
              items={[
                <>
                  <strong className="font-semibold">Campus sampling.</strong> A
                  table at a wellness market or a club fair. Students tap on the
                  way past, and the pass leaves with them.
                </>,
                <>
                  <strong className="font-semibold">
                    Booth sampling wherever your team already works.
                  </strong>{" "}
                  The card does the measuring. Your staffing, your product and
                  your table stay as they are.
                </>,
                <>
                  <strong className="font-semibold">Sampling with a store nearby.</strong>{" "}
                  When a retailer will scan a coupon barcode at the register, a
                  purchase ties back to the tap. Only when a store will scan.
                </>,
              ]}
            />
          </Section>

          <Section label="Proof it's real">
            <BulletList
              items={[
                <>
                  <strong className="font-semibold">
                    Pocari Sweat &times; LMU Wellness Wednesday.
                  </strong>{" "}
                  Wed Oct 14, 2026, 11 AM&ndash;2 PM, one table, 200+ Ice Slurry
                  samples by the on-site count.
                </>,
                <>
                  94 people tapped a card (114 taps). 65 added the pass to Apple
                  Wallet, 69% of the people who tapped.
                </>,
                <>
                  64 still had it in Wallet as of Oct 21, one removed. 26 clicked
                  through: 43 clicks, 39 to the shop offer and 4 to Instagram.
                </>,
                <>
                  Source: the Campus Run activation report.{" "}
                  <Link href="/#proof" className="font-semibold underline underline-offset-2">
                    See the funnel and page one of the report.
                  </Link>
                </>,
              ]}
            />
          </Section>
        </div>

        <div className="mt-14">
          <AskCard>
            <strong className="font-semibold text-white">
              The next step is a call, not a quote.
            </strong>{" "}
            Tell us who staffs the booth, what you tracked last time and whether a
            store will scan, and we scope the day as Core, Plus or Advanced. No
            prices on the site, because a day gets scoped on the call.
          </AskCard>
        </div>
      </main>

      <SiteFooter tagline="stop guessing. get stoked" />
    </div>
  );
}
