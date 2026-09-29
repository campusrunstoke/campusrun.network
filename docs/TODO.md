# Campus Run — What's left

Working list, ordered by what blocks what. Tick things off as they land.
Companion doc: [FEATURES.md](FEATURES.md).

_Last updated: 2026-09-28 · Fallapalooza is **Oct 4** (6 days)_

---

## 1. Blocked on Kasey

- [ ] **Pick a poster design** (p1–p4) and **a banner design** (b1–b4)
- [ ] **Report what the two front buttons actually say** on his iOS 27 phone —
      Apple writes those labels itself and we can't see them without a device
- [ ] Confirm the big text should stay **ENTER TO WIN**
- [ ] **Twilio number + keyword** (see §2)
- [ ] Which LMU stores will let a cashier scan — only needed if we ever switch this
      campaign back to redemption
- [ ] Confirm he has **not** encoded any cards yet

## 2. The SMS giveaway — the one real blocker

Right now the giveaway button counts the tap and opens the Pocari site. It does not
yet open a text message. To finish it:

- [ ] Kasey buys a **Twilio phone number** (~$1–2/month + ~1¢ per text)
- [ ] Decide the **keyword** students text (POCARI? WIN?)
- [ ] Decide whether they get an **auto-reply** confirming entry
- [ ] Point the giveaway link at `sms:+1XXXXXXXXXX&body=KEYWORD` instead of the placeholder
- [ ] **Test that a redirect to an `sms:` link actually opens Messages from inside a
      Wallet pass** — this is unproven and is the riskiest unknown left
- [ ] Build the Twilio webhook that receives replies and records the entry
- [ ] Add entries to the dashboard as their own number
- [ ] Decide what happens to a student who texts the wrong thing

## 3. Before real cards are printed

- [ ] Lock the design (§1)
- [ ] **Mint the real Pocari card batch** in the console
- [ ] Send Kasey the card URL list for NFC encoding
- [ ] Spot-check a sample of the printed/encoded cards before the event
- [ ] Same for California Born

## 4. Testing we still owe

- [ ] Add a pass on **iOS 27** and confirm the poster renders crisp, not blurred
- [ ] Add a pass on an **older iPhone** and confirm the banner fallback looks right
- [ ] Confirm **both front buttons work and are counted**
- [ ] Confirm back-of-pass links work on the banner version
- [ ] Confirm the **web coupon** (Android path) works end to end
- [ ] Re-tap the same card and confirm it re-issues the *same* pass, not a second one
- [ ] Delete a pass and confirm **pass_removed** fires
- [ ] Load test: simulate a few hundred taps in a short window
- [ ] Check the dashboard numbers match the raw CSV exactly

## 5. Known gaps (deliberate, not forgotten)

- [ ] **Google Wallet** — Android gets the tracked web coupon instead. Real Google
      Wallet is a separate build (~3–4 days)
- [ ] **Receipt photo upload** — we capture store and amount today; photo + verification
      is next
- [ ] **Flip the pass to "Redeemed"** after purchase — needs Apple's push certificate
- [ ] **Client logins** — internal-only for now, but everything is already scoped per
      campaign so this is an add, not a rebuild
- [ ] **Email/phone gate before the pass** — switch already in the database, off by default
- [ ] **Promo codes / Shopify redemption** — Kasey scoped these out of v1

## 6. Housekeeping

- [ ] Delete the mockup campaigns once a design is chosen
- [ ] Agree a "tell me before you push" rule with Kasey — we collided on a database
      migration once already
- [ ] Rotate the signing certificate if anyone leaves the project

---

## Final gate — full system test before Oct 4

**Do this only once §1–§3 are done.** A front-to-back pass over the whole system:

- [ ] **Every path end to end** — iPhone, Android, old iPhone, web coupon
- [ ] **Every analytic** verified against raw data, not just eyeballed
- [ ] **Security review** — auth, rate limits, the redirector, redemption guards,
      secret handling
- [ ] **Failure behaviour** — what happens if the database is slow, if signing fails,
      if a student taps a dead card, if the same card is tapped 50 times
- [ ] **Load** at realistic festival volume
- [ ] **A dry run at the smaller California Born activation** before Pocari, if timing allows
