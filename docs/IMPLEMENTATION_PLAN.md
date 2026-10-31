# Doxa Car Hire — What's Built, What's Left

**Project:** SP-DOXA-2026-001 · Doxa Motor Solutions · SpectreTech Limited
**Based on:** the Solution Design Document (v1.0) and a check of the actual system today.

This page tracks progress in plain English — no code talk. Each row is a feature Doxa asked for.
**% Complete** is how much of it actually works today. **What's Still Missing** is what's left before
it's fully done. **Suggestions** is optional — ideas for later polish (can be blank). We'll update this as we build.

---

## 1. Clients & Bookings


| Feature                                                                                                                                                                                                                                                     | % Complete | What's Still Missing                                                                                                                                        | Suggestions                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Client registration** — staff add a new hirer's details: name, phone, email, National ID/passport number + **copy**, driving licence number + **copy**, address, next of kin, employer, second contact. Upload ID/licence copies on register (step 3) and client view; booking create and dispatch block until both copies are on file. | 100%       | Working — all Scope 2.1 fields required; uniqueness on phone, ID/passport, email; ID_COPY + LICENCE attachments via Documents; hire blocked without both copies. | |
| **Client search** — staff find an existing client by National ID or phone number (used for vetting at the counter).                                                                                                                                         | 100%       | Working on the Clients page — backend lookup by name / ID / phone (including 07↔254). No separate lookup page.                                              | Later: recent searches or a “vetting” badge when licence is near expiry.                             |
| **Suspend / reactivate a client** — block a problem client from booking again, and unblock them later.                                                                                                                                                      | 95%        | Fully working.                                                                                                                                              |                                                                                                      |
| **Create a booking** — pick a client and a car, set the dates; the system works out the number of days and the charge automatically, and won't allow double-booking a car.                                                                                  | 100%       | Working — booking confirmation email + SMS fire automatically (email uses RESEND_TEST_EMAIL until the domain is live; SMS queues until API keys are set). Snapshots daily rate + car-type penalty rule. |                                                                                                      |
| **Dispatch a vehicle** — staff record the car's condition (any existing dents/marks), then release it to the client.                                                                                                                                        | 100%       | Condition (dents, fuel, odometer) required; vehicle/status edge cases guarded; email + SMS on release. No document upload on dispatch.                      | Optional photo attach on condition check once Documents Repository is live.                          |
| **Return / check-in a vehicle** — staff record the car's condition on return, close out the hire, and free up the car (**Mark returned / End hire**).                                                                                                      | 95%        | Required return condition; side-by-side vs dispatch; new-damage flag; ends hire so overdue counter stops.                                                   |                                                                                                      |
| **Extend a hire** — push back the return date on an active hire without losing the original booking record.                                                                                                                                                 | 95%        | Extend tab in booking eye modal; extra days × booking daily rate; days field synced.                                                                        |                                                                                                      |
| **Cancel a reservation** — cancel before dispatch and free the vehicle.                                                                                                                                                                                    | 95%        | Cancel tab for RESERVED bookings.                                                                                                                           |                                                                                                      |


---



## 2. Fleet & Car Owners


| Feature                                                                                                                                                                           | % Complete | What's Still Missing                                                                                                                                       | Suggestions |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Vehicle register** — add and view cars: type (saloon, SUV/4x4, van/minibus, pickup, economy), daily rate, and whether it's parked, hired, etc. Each car is linked to one owner. | 100%       | Working — view/edit modal with per-field pens; insurance & inspection dates editable.                                                                      |             |
| **Owner registration** — add a car owner's details: ID, KRA PIN, bank details, M-Pesa number, next of kin.                                                                        | 75%        | The owner's logbook and signed agreement will be attached via the new Documents Repository (see Staff Accounts, Roles & Security section) — not built yet. |             |
| **Owner payment arrangement** — set how each owner gets paid: a percentage split, a fixed recurring deduction, itemised costs, or a mix of these.                                 | 25%        | Only one simple arrangement type is supported right now — the flexible "pick any of the four" setup still needs to be built.                               |             |


---



## 3. Charges & Payments


| Feature                                                                                                                                                                  | % Complete | What's Still Missing                                                                                                                      | Suggestions |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Automatic hire charge** — daily rate × number of days, worked out by the system with no manual maths.                                                                  | 95%        | Hire fees panel shows base / extensions / penalty / paid / balance on the booking modal.                  |             |
| **Late-return penalty rules** — Super Admin sets grace, rate (per hour/day), cap, and optional car type.                                                                  | 95%        | Super Admin only (not assignable roles); audit on change; per vehicle type + default.                     |             |
| **Automatic late penalty** — if a car comes back after the grace period, the system adds the penalty automatically and keeps a note of how it was worked out.            | 90%        | Preview at Mark returned; snapshotted rule; trail on Overview. Missing rule → KES 0 with notice.          |             |
| **Who owes what** — a running view of what's been paid against a booking versus what's still outstanding.                                                                | 90%        | Compulsory hire-fees panel on booking eye modal.                                                          |             |
| **Record a payment manually** — staff log a cash, bank, or M-Pesa payment against a booking.                                                                             | 70%        | Working, minor polish only.                                                                                                               |             |
| **M-Pesa payment prompt** — send a payment request straight to the client's phone (STK Push), including a quick-pay option that doesn't require picking a booking first. | 65%        | Not yet available as a button directly on every booking screen — currently mainly through a separate quick-pay tool.                      |             |
| **Automatic payment confirmation** — when Safaricom confirms a payment, the booking is marked paid automatically, without double-counting repeat confirmations.          | 50%        | Needs stronger safeguards to guarantee a repeated confirmation can never be counted twice.                                                |             |
| **Owner payout calculation** — for a period, work out what an owner earned from their cars, minus agreed expenses and commission, to get their net pay.                  | 45%        | Currently calculates from the total charge rather than money actually received; doesn't yet handle a case where an owner owes money back. |             |
| **Owner payout approval & payment** — move a payout from draft, to approved, to marked as paid with a reference.                                                         | 40%        | The "mark as paid" screen and the owner notification aren't built yet.                                                                    |             |


---



## 4. Vehicle Document Expiry


| Feature                                                                                                                                                    | % Complete | What's Still Missing                                                          | Suggestions |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------- | ----------- |
| **Insurance & inspection expiry tracking** — the system watches each car's insurance and inspection dates and raises a warning 7 days before they run out. | 75%        | Needs testing to confirm the warning fires exactly 7 days before, not 6 or 8. |             |


---



## 5. Automated Messages (SMS & Email)


| Feature                                                                                                                                                                                                     | % Complete | What's Still Missing                                                                                                              | Suggestions |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Message record-keeping** — every SMS/email the system tries to send is logged with its status (queued, sent, failed), viewable by staff.                                                                  | 50%        | Working as a record; see below for actual sending.                                                                                |             |
| **Branded emails** — Doxa-branded emails sent to clients and owners.                                                                                                                                        | 15%        | The email system works, but the specific wording for each of the 8 message types below still needs to be written and connected.   |             |
| **SMS with company name (Sender ID)** — text messages sent when a client has no email on file.                                                                                                              | 25%        | SMS module ready; booking confirmations queue automatically. Connect SMS_API_KEY / SMS_USERNAME / SMS_SENDER_ID to go live.       |             |
| **The 8 automatic trigger messages** — booking confirmed, vehicle dispatched, payment received, hire ending soon (2 hrs before), vehicle overdue, vehicle returned, owner paid, and document expiring soon. | 55%        | Booking confirmed + dispatched send. Staff get live blue (ending soon) / red (overdue) prompts in admin; overdue also queued to Notifications. Client SMS/email for remaining triggers still thin. | Payment intelligence layer next. |
| **Bulk messages** — the Director sends one message to a chosen group of clients, or a broadcast to owners.                                                                                                  | 5%         | The screen to pick a group and send hasn't been built yet.                                                                        |             |


---



## 6. Reports


| Feature                                                                                                             | % Complete | What's Still Missing                                                                                                       | Suggestions |
| ------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Owner payout reports & statements** — a printable summary of what each owner earned and was paid.                 | 0%         | Not started.                                                                                                               |             |
| **Revenue & expense reports** — income by vehicle, income by month, costs by vehicle.                               | 0%         | Not started.                                                                                                               |             |
| **Outstanding balances & booking history reports** — who owes money, and a full record of past hires.               | 20%        | Only a basic spreadsheet-style export exists; not yet a proper formatted report.                                           |             |
| **Client invoice, receipt & hire agreement** — a proper invoice, payment receipt, and the printable hire agreement. | 5%         | Needs Doxa's approved contract wording before the agreement template can be finished; invoice/receipt still a rough draft. |             |
| **Secure report downloads** — only staff with the right permission can export reports.                              | 90%        | Working.                                                                                                                   |             |


---



## 7. Director Dashboard


| Feature                                                                                                                                                                                                                                       | % Complete | What's Still Missing                                                                                    | Suggestions                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Home dashboard & charts** — one screen showing cars out now, cars parked, cars due back today, overdue cars, money collected today/this month, who owes money, and documents about to expire — with a chart view as well as a numbers view. | 90%        | Booking intelligence polls live: overdue/ending-soon prompts + bell badge. Dashboard KPIs still refresh on navigation. | Payment intelligence layer later. |


---



## 8. Staff Accounts, Roles & Security


| Feature                                                                                                                                                                                                                                                                     | % Complete | What's Still Missing                                                                                                                                                                                       | Suggestions |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Staff login & self-service** — staff sign in with email and password, can change their own password, reset a forgotten one, and view their own profile. Only invited people can get in — no public sign-up.                                                               | 90%        | Working.                                                                                                                                                                                                   |             |
| **Protection against break-in attempts** — repeated wrong-password attempts on an account get temporarily locked out.                                                                                                                                                       | 90%        | Works for normal use; would need strengthening for a larger, multi-server deployment.                                                                                                                      |             |
| **Roles & permissions** — the Director creates named roles (e.g. Clerk, Yard Staff, Accountant), ticks exactly what each role is allowed to do, and assigns one role per staff member. Enforced by the system itself, not just hidden buttons.                              | 95%        | Penalty rule edits are Super Admin only (not in Roles assign list).                                                                                                                                        |             |
| **Staff invitations & suspension** — the Director adds staff by email and can suspend someone so they can no longer log in.                                                                                                                                                 | 80%        | Working, minor polish only.                                                                                                                                                                                |             |
| **Documents Repository** — a dedicated page in the sidebar where staff upload documents (PDF, Excel, Word, or CSV) — logbooks, signed agreements, insurance certificates, etc. — and link each one to a client, vehicle, or owner record. Stored privately, never a public link. | 85%        | Sidebar Documents page live: upload with metadata, link to client/vehicle/owner/general, private `car-hire-docs` bucket + signed downloads. Assign `doc:*` permissions on roles for non–super-admin staff. | Photo attach on condition checks; filter/search polish. |
| **Activity log** — records who changed important things (roles, permissions, money-related settings) and when.                                                                                                                                                              | 55%        | Penalty rule changes are audited (`penalty_rule.activate`).                                                                                                                                                |             |
| **System reliability** — if something unexpected goes wrong, staff see a friendly message instead of the site crashing.                                                                                                                                                     | 85%        | Working.                                                                                                                                                                                                   |             |


---



## 9. Going Live


| Feature                                                                                                                      | % Complete | What's Still Missing                                                                           | Suggestions |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- | ----------- |
| **Import existing records** — bring in Doxa's current vehicle, owner and client lists from Word documents / paper.           | 0%         | Not started — waiting on the source files from Doxa.                                           |             |
| **Production deployment** — the live website running on its own domain, secured.                                             | 10%        | Still on a development setup; go-live checklist not started.                                   |             |
| **Staff training & sign-off** — Director, Clerk, Yard Staff and Accountant trained and confirming the system works for them. | 0%         | Not started — happens near the end, once features above are further along.                     |             |
| **Final security check** — one last pass confirming nothing is left exposed before go-live.                                  | 20%        | Most individual security pieces above are done; the full end-to-end check hasn't been run yet. |             |


---

*Prepared by SpectreTech Limited · Doxa Car Hire · SP-DOXA-2026-001. Update the %, "What's Still Missing", and optional "Suggestions" columns as features ship — a working demo isn't the same as 100%.*

### Recently shipped (security / loyalty / settings)

- Suspicious-delete scoring + email on score rise — see `docs/SECURITY.md`
- `/admin/settings` — category starting prices + loyalty metrics (editable)
- Loyalty earn on RETURNED + balance 0 + active client; suspend clears points to 0
