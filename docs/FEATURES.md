# Campus Run — What the software does

A plain-English inventory of everything built and live. Update this when we ship
something new. Companion doc: [TODO.md](TODO.md).

_Last updated: 2026-09-29 · everything below is live on www.campusrun.network_

---

## The two products

**1. Wallet tracking** (the Pocari product) — student taps an NFC card, gets a coupon
in Apple Wallet, taps links on it, and redeems. Every step is counted.

**2. Stoked rating + smart links** (the original product) — student taps a card and
either rates 1–5 or gets redirected to the brand's site. Taps counted either way.

Both run on the same site and the same admin console.

---

## Wallet tracking

### What a student experiences

| Step | What happens | What we record |
|---|---|---|
| Taps the NFC card or scans its QR | Lands on `/c/{card_id}` | **tap** — card, campaign, iPhone vs Android, time |
| iPhone | Gets a real Apple Wallet pass | — |
| Android / older iPhone | Gets a web coupon page with the same links | — |
| Adds the pass to Wallet | Apple's servers tell us | **pass_added** |
| Deletes the pass | Apple tells us | **pass_removed** |
| Taps a link on the pass | Counted, then sent to the real destination | **click** — which link |
| Redeems | Cashier scan or self-report | **redemption** — store, time, amount, method |

### Pass-through links (all tracked separately)

Every link goes through `campusrun.network/r/{pass}/{action}` — we count it, then
redirect. Five kinds:

- **giveaway** — enter-to-win (currently a placeholder; needs Twilio)
- **map** — where to buy
- **website** — brand's site
- **video**
- **shop**

Destinations are set per campaign in the console. A link with no destination still
counts the tap and sends them to our homepage, so nothing breaks. An invalid link
redirects safely and is **not** counted.

### Pass design (per campaign)

Each brand gets its own look. Configurable: big offer text, both labels, second line,
terms, three colours, logo, icon, banner image, full background image.

Two layouts:
- **Poster** (iOS 27+) — full-bleed artwork, plus **two tappable buttons on the front**
- **Banner** (all iPhones) — classic layout with a banner strip; links on the back via ⓘ

Both ship inside the same pass; the phone picks. Apple caps front buttons at two.

### Front-of-pass buttons (iOS 27 poster only)

Apple calls these **Featured Actions**. We choose the *type*; Apple writes the words.
We cannot set custom button text. Tested on a real iOS 27 device:

| Link | Apple action type | What the button says | Tracked |
|---|---|---|---|
| Giveaway | `viewOffersRewards` | **View Offers and Rewards** | ✅ |
| Map | `order` | **Order Delivery and Pickup** | ✅ |

Other types we confirmed render: `shop` → *Shop Online or In-App*,
`membershipBenefits` → *View Membership Benefits*.

**Apple's `place` ("Open in Maps") does not work on our pass type.** Tested six ways —
coordinates in both places Apple allows, Apple and Google map URLs, tracked and direct,
poster and classic style. Apple documents venue coordinates as event-ticket-only.
Don't re-test this.

The classic/banner style shows **no** front buttons at all — links live on the back (ⓘ).

### Typography

**Apple allows no custom fonts in pass text** — every field renders in Apple's own face
(on iOS 27 posters, the typewriter-style one). Brand typography therefore lives in the
images: the **logo** carries the wordmark and the **artwork** carries any headline.
That's how Apple's own museum example gets its serif "MUSEUM" — it's the logo image.

Controls we do have: text alignment, which field slots are used, hiding the header text
when the logo already carries the brand, colours, and removing iOS 27's header shadow.

### Redemption — two ways, switchable per campaign

- **Cashier scan** — the pass barcode is the redeem link. Staff scan it with their own
  phone camera, pick their store, enter a store PIN, confirm. One redemption per pass,
  enforced in the database.
- **Self-report** — student says where they bought it. Tagged differently so verified
  and self-reported never get mixed in a client report.

Barcode can be switched off per campaign (giveaway mode) and back on without a deploy.

### Card management

Create a campaign in the console → it mints a batch of card IDs → each gets its URL and
a printable QR → hand the list to whoever encodes the cards. Mint more any time.

---

## Analytics

### Per campaign
- **Funnel** — people reached → passes added → clicked → redeemed, with conversion % at
  each step. Every rate uses *people reached* as the denominator so no number can exceed 100%.
- **Taps per hour** chart (to see the booth's peak)
- **iOS vs Android** split
- **Clicks by link type**
- **Redemptions** by store, by hour, by day of week, by method
- **Passes** still installed vs removed vs redeemed
- **Recent events** feed

### Across campaigns
- Comparison table with headline numbers for every activation

### Reporting
- **Weekly report page** — print-ready, this week vs cumulative, redemptions by store
- **CSV exports** — raw wallet events (per campaign), ratings, redirect taps, inbound leads

---

## Stoked rating + smart links

- **Rating page** — 1–5 tap plus optional email. Works on bad festival signal: if the
  network fails, it saves locally and retries in the background, and the student always
  sees the thank-you.
- **Smart links** — NFC card sends people straight to the brand's site while still
  counting the tap. Captures click ID, referrer, and city/region/country.
- Admin table of every submission and tap, with filtered CSV export and per-row delete.

---

## Brand intake

- Public form at `/work-with-us`
- Inbound inquiries land in the console with a pipeline status (new → contacted →
  qualified → closed)
- Email notification on every new inquiry, sent from our own mailbox over plain SMTP
  (no paid service)

---

## Admin console

- Per-person accounts with real passwords (argon2-hashed, never stored in plain text)
- Sessions stored server-side, revocable on logout, expire after 7 days
- Four sections: Submissions · Campaigns · Intake · Wallet

---

## Security

- Passwords argon2-hashed; session tokens stored only as a hash, so a database leak
  can't be replayed
- Every Apple Wallet callback authenticated with a per-pass token, compared in constant time
- Pass serial numbers are random and non-guessable — nobody can walk through them
- The link redirector can't be pointed at an arbitrary URL, so our domain can't be used
  to redirect people somewhere malicious
- One redemption per pass, enforced at the database level
- Rate limiting on every public endpoint; hidden honeypot fields against bots
- Signing certificate and all secrets in environment variables, never in the code
- Admin pages and all exports require a login

---

## Infrastructure

- Next.js on Vercel, Postgres on Neon
- Automated checks on every push: linting, type checking, 60 unit tests, build, browser tests
- Database changes go through versioned migrations
- Running cost at pilot scale: roughly $0–20/month
