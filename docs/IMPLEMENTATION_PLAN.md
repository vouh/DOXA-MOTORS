# Doxa Car Hire — What's Built, What's Left

**Project:** SP-DOXA-2026-001 · Doxa Motor Solutions · SpectreTech Limited
**Based on:** the Solution Design Document (v1.0) and a check of the actual system today.

This page tracks progress in plain English — no code talk. Each row is a feature Doxa asked for.
**% Complete** is how much of it actually works today. **What's Still Missing** is what's left before
it's fully done. We'll update this as we build.

---

## 1. Clients & Bookings

| Feature | % Complete | What's Still Missing |
|---|---|---|
| **Client registration** — staff add a new hirer's details: name, phone, email, National ID/passport number, driving licence number, address, next of kin, employer, second contact. No photos or scans are taken — just the ID and licence numbers as text. | 100% | Working — address, next of kin, kin contact, and employer are required. |
| **Client search** — staff find an existing client by National ID or phone number (used for vetting at the counter). | 85% | Clients list search (name / ID / phone) with animated search bar filters the table. |
| **Suspend / reactivate a client** — block a problem client from booking again, and unblock them later. | 95% | Fully working. |
| **Create a booking** — pick a client and a car, set the dates; the system works out the number of days and the charge automatically, and won't allow double-booking a car. | 85% | The "booking confirmed" message to the client isn't sent automatically yet. |
| **Dispatch a vehicle** — staff record the car's condition (any existing dents/marks), then release it to the client. | 80% | Small edge-case handling still to tidy up. |
| **Return / check-in a vehicle** — staff record the car's condition on return, close out the hire, and free up the car. | 70% | No side-by-side comparison yet between "condition at dispatch" and "condition at return" to flag new damage. |
| **Extend a hire** — push back the return date on an active hire without losing the original booking record. | 50% | The calculation exists, but there's no simple screen for staff to actually do this yet. |

---

## 2. Fleet & Car Owners

| Feature | % Complete | What's Still Missing |
|---|---|---|
| **Vehicle register** — add and view cars: type (saloon, SUV/4x4, van/minibus, pickup, economy), daily rate, and whether it's parked, hired, etc. Each car is linked to one owner. | 85% | No screen yet to edit a vehicle's details after it's added. |
| **Owner registration** — add a car owner's details: ID, KRA PIN, bank details, M-Pesa number, next of kin. | 75% | The owner's logbook and signed agreement will be attached via the new Documents Repository (see Staff Accounts, Roles & Security section) — not built yet. |
| **Owner payment arrangement** — set how each owner gets paid: a percentage split, a fixed recurring deduction, itemised costs, or a mix of these. | 25% | Only one simple arrangement type is supported right now — the flexible "pick any of the four" setup still needs to be built. |

---

## 3. Charges & Payments

| Feature | % Complete | What's Still Missing |
|---|---|---|
| **Automatic hire charge** — daily rate × number of days, worked out by the system with no manual maths. | 90% | Working. |
| **Late-return penalty rules** — the Director sets the grace period, the late fee (per hour or per day), and a maximum cap, from a settings screen. | 60% | No record kept of who changed a rule and when; the system doesn't yet stop and warn if no rule has been set at all. |
| **Automatic late penalty** — if a car comes back after the grace period, the system adds the penalty automatically and keeps a note of how it was worked out. | 75% | Needs a safe fallback for the (rare) case where no penalty rule exists yet. |
| **Who owes what** — a running view of what's been paid against a booking versus what's still outstanding. | 50% | Needs a clearer "paid / still owing" view for staff to check at a glance. |
| **Record a payment manually** — staff log a cash, bank, or M-Pesa payment against a booking. | 70% | Working, minor polish only. |
| **M-Pesa payment prompt** — send a payment request straight to the client's phone (STK Push), including a quick-pay option that doesn't require picking a booking first. | 65% | Not yet available as a button directly on every booking screen — currently mainly through a separate quick-pay tool. |
| **Automatic payment confirmation** — when Safaricom confirms a payment, the booking is marked paid automatically, without double-counting repeat confirmations. | 50% | Needs stronger safeguards to guarantee a repeated confirmation can never be counted twice. |
| **Owner payout calculation** — for a period, work out what an owner earned from their cars, minus agreed expenses and commission, to get their net pay. | 45% | Currently calculates from the total charge rather than money actually received; doesn't yet handle a case where an owner owes money back. |
| **Owner payout approval & payment** — move a payout from draft, to approved, to marked as paid with a reference. | 40% | The "mark as paid" screen and the owner notification aren't built yet. |

---

## 4. Vehicle Document Expiry

| Feature | % Complete | What's Still Missing |
|---|---|---|
| **Insurance & inspection expiry tracking** — the system watches each car's insurance and inspection dates and raises a warning 7 days before they run out. | 75% | Needs testing to confirm the warning fires exactly 7 days before, not 6 or 8. |

---

## 5. Automated Messages (SMS & Email)

| Feature | % Complete | What's Still Missing |
|---|---|---|
| **Message record-keeping** — every SMS/email the system tries to send is logged with its status (queued, sent, failed), viewable by staff. | 50% | Working as a record; see below for actual sending. |
| **Branded emails** — Doxa-branded emails sent to clients and owners. | 15% | The email system works, but the specific wording for each of the 8 message types below still needs to be written and connected. |
| **SMS with company name (Sender ID)** — text messages sent when a client has no email on file. | 0% | No SMS provider is connected yet — this hasn't started. |
| **The 8 automatic trigger messages** — booking confirmed, vehicle dispatched, payment received, hire ending soon (2 hrs before), vehicle overdue, vehicle returned, owner paid, and document expiring soon. | 25% | Most of these are logged but not actually being sent to clients/owners yet — the background process that sends them still needs to be built. |
| **Bulk messages** — the Director sends one message to a chosen group of clients, or a broadcast to owners. | 5% | The screen to pick a group and send hasn't been built yet. |

---

## 6. Reports

| Feature | % Complete | What's Still Missing |
|---|---|---|
| **Owner payout reports & statements** — a printable summary of what each owner earned and was paid. | 0% | Not started. |
| **Revenue & expense reports** — income by vehicle, income by month, costs by vehicle. | 0% | Not started. |
| **Outstanding balances & booking history reports** — who owes money, and a full record of past hires. | 20% | Only a basic spreadsheet-style export exists; not yet a proper formatted report. |
| **Client invoice, receipt & hire agreement** — a proper invoice, payment receipt, and the printable hire agreement. | 5% | Needs Doxa's approved contract wording before the agreement template can be finished; invoice/receipt still a rough draft. |
| **Secure report downloads** — only staff with the right permission can export reports. | 90% | Working. |

---

## 7. Director Dashboard

| Feature | % Complete | What's Still Missing |
|---|---|---|
| **Home dashboard & charts** — one screen showing cars out now, cars parked, cars due back today, overdue cars, money collected today/this month, who owes money, and documents about to expire — with a chart view as well as a numbers view. | 85% | Figures update on page refresh, not live/automatically — good enough for now, could be made live later. |

---

## 8. Staff Accounts, Roles & Security

| Feature | % Complete | What's Still Missing |
|---|---|---|
| **Staff login & self-service** — staff sign in with email and password, can change their own password, reset a forgotten one, and view their own profile. Only invited people can get in — no public sign-up. | 90% | Working. |
| **Protection against break-in attempts** — repeated wrong-password attempts on an account get temporarily locked out. | 90% | Works for normal use; would need strengthening for a larger, multi-server deployment. |
| **Roles & permissions** — the Director creates named roles (e.g. Clerk, Yard Staff, Accountant), ticks exactly what each role is allowed to do, and assigns one role per staff member. Enforced by the system itself, not just hidden buttons. | 90% | A couple of sensitive actions (like penalty-rule changes) aren't yet recorded in the activity log. |
| **Staff invitations & suspension** — the Director adds staff by email and can suspend someone so they can no longer log in. | 80% | Working, minor polish only. |
| **Documents Repository** — a dedicated page in the sidebar where staff upload documents (PDF, Excel, or Word) — logbooks, signed agreements, insurance certificates, etc. — and link each one to a client, vehicle, or owner record. Stored privately, never a public link. | 15% | The secure storage itself is ready in the background, but the repository page hasn't been built yet: needs the sidebar page, the upload-and-link-to-a-record screen, and support for the three file types. |
| **Activity log** — records who changed important things (roles, permissions, money-related settings) and when. | 40% | Doesn't yet cover every sensitive change, e.g. penalty rule edits. |
| **System reliability** — if something unexpected goes wrong, staff see a friendly message instead of the site crashing. | 85% | Working. |

---

## 9. Going Live

| Feature | % Complete | What's Still Missing |
|---|---|---|
| **Import existing records** — bring in Doxa's current vehicle, owner and client lists from Word documents / paper. | 0% | Not started — waiting on the source files from Doxa. |
| **Production deployment** — the live website running on its own domain, secured. | 10% | Still on a development setup; go-live checklist not started. |
| **Staff training & sign-off** — Director, Clerk, Yard Staff and Accountant trained and confirming the system works for them. | 0% | Not started — happens near the end, once features above are further along. |
| **Final security check** — one last pass confirming nothing is left exposed before go-live. | 20% | Most individual security pieces above are done; the full end-to-end check hasn't been run yet. |

---

*Prepared by SpectreTech Limited · Doxa Car Hire · SP-DOXA-2026-001. Update the % and "What's Still Missing" columns as features ship — a working demo isn't the same as 100%.*
