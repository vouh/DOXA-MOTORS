# Doxa Car Hire — Implementation Plan

**Project:** SP-DOXA-2026-001 · Doxa Motor Solutions · SpectreTech Limited  
**Source:** Solution Design Document v1.0 + codebase audit (Jul 2026)  
**Docs:** [ARCHITECTURE.md](ARCHITECTURE.md) — architecture, backend setup, and RBAC in one file

**How to use this file**

1. **Feature inventory** — one table for everything. Update **Done %** as you ship (0 → 100%). Demo/stub ≠ 100%.
2. **Staged plan** (below) — build order. Each stage: purpose, work, security, tests.

**Table columns**

| Column | Who it’s for | What it holds |
|--------|----------------|---------------|
| **Plain English** | Director / non-dev readers | What the feature does in everyday language (view, create, edit, delete, block, …) |
| **Technical** | Developers | Frameworks, file/route/model names, packages |
| **Done %** | Everyone | Progress |
| **Still needed** | Builders | What’s left for 100% |

**Stack:** Next.js · Supabase · Prisma · Zod · Resend · SMS · M-Pesa Daraja · Vercel · Sentry · Vitest · Playwright  

**Out of scope (unless Change Request):** GPS · WhatsApp · native app · card payments · loyalty · accounting integration · 24h ops after handover

---

# Feature inventory

| # | Feature | Plain English (what staff / the system does) | Technical (code & stack) | Done % | Still needed |
|---|---------|-----------------------------------------------|--------------------------|--------|--------------|
| 1 | Project scaffold | The staff website shell: blue/white Doxa look, sidebar, login area. | Next.js 15 App Router; TypeScript; Tailwind; `app/admin/(app)/layout.tsx`; Montserrat/brand tokens | 90% | Nav filtered by permission (Stage 2) |
| 2 | Database schema | All car-hire records live in one Postgres database (clients, cars, bookings, money, messages). | Prisma `schema.prisma`; tables `car_*`, `vehicle_documents`, `attachments`, `users`, …; migrations under `prisma/migrations/` | 85% | Stage 2 `permissions` / `roles` tables |
| 3 | DB connection strings | App talks to Supabase Postgres safely (pooled for app, direct for migrations). | Env `DATABASE_URL` (pooler), `DIRECT_URL` (session) | 100% | — |
| 4 | Staff login | Staff sign in with email + password; only invited people get in. | Supabase Auth; `/admin/login`; `app/api/auth/login`; cookies via `@supabase/ssr` | 90% | Invite UX polish |
| 5 | Secrets & env safety | Passwords and API keys stay on the server; build folders not committed. | `.gitignore`; `lib/env.ts` Zod; no `NEXT_PUBLIC_` for Daraja/service role; Sentry optional | 75% | Set `SENTRY_DSN` on staging |
| 6 | Unit tests | Automated checks that hire days, penalties, and payouts calculate correctly. | Vitest; `lib/car-hire/calculations.test.ts`; `npm test` | 80% | More suites per stage |
| 7 | Browser tests | Automated click-through: open login page and confirm it loads. | Playwright; `e2e/login.smoke.spec.ts`; `npm run test:e2e` | 40% | Full hire E2E later |
| 8 | Error monitoring | Unexpected crashes can be sent to an error dashboard. | `@sentry/nextjs`; `instrumentation.ts`; `SENTRY_DSN` | 50% | Verify forced error in staging |
| 9 | Sample seed data | Dev database comes with example staff, cars, clients, and one booking. | `prisma/seed.ts`; `npm run db:seed` + `db:bootstrap-auth` | 90% | Re-seed after schema push |
| 10 | Remove old SACCO system | Old member/contribution/meeting tables and screens removed; only car hire remains. | Dropped legacy models/routes; script `scripts/drop-legacy-sacco-tables.sql` | 95% | Keep docs in sync |
| 11 | Private file storage | ID scans, licences, logbooks stored privately (not a public link anyone can guess). | `attachments` table; `lib/storage/upload.ts`; bucket `car-hire-docs`; signed URLs | 40% | Wire uploads on client/owner forms (Stages 4–5) |
| 12 | Permission list (fixed) | List of allowed actions in the product (e.g. “dispatch vehicle”). Admin cannot invent new action types—only developers add those. | `lib/rbac/registry.ts` keys like `booking:dispatch`, `client:lookup` | 0% | Implement Stage 2 |
| 13 | Roles (admin-created) | Director creates named roles (Clerk, Yard, “Night Supervisor”), ticks which actions each role may do, assigns **one role per staff email**. | Prisma `Role`, `RolePermission`, `User.roleId`; `/admin/staff` | 5% | Persist UI; replace demo matrix |
| 14 | Server permission check | Even if someone types a URL or calls an API, the server blocks them without permission. | `requirePermission()` in `lib/rbac/require.ts`; every `app/actions/car-hire.ts` action | 90% | CI unguarded-action test; audit on money/settings |
| 15 | One admin workspace | Everyone uses the same `/admin` app; menu items appear/hide by role. No separate “yard website” vs “finance website”. | `app/admin/(app)/*`; `lib/rbac/nav.ts` | 15% | Filter NAV + widgets by permissions |
| 16 | Staff invite / deactivate | Director adds staff by email; can suspend so they cannot log in. No public self-signup for staff. | `app/actions/staff.ts`; Supabase Admin `createUser`; status `ACTIVE`/`SUSPENDED` | 40% | Full invite form on staff page |
| 17 | Audit trail | Important changes (penalty rules, roles, money) record who did what and when. | `audit_logs`; `lib/audit.ts` `writeAudit` | 30% | Call from all car-hire money/settings actions |
| 18 | Client registration | Staff can **add** a hirer: name, phone, email, National ID/passport, licence, address, next of kin, employer, second contact. | `CarClient`; `createCarClient`; Zod `clientSchema`; `/admin/clients` | 70% | Stronger KE phone/ID Zod rules |
| 19 | Client ID & licence files | Staff can **upload** ID and licence copies; only staff can open them. | `Attachment` kind `id_copy` / `licence_copy`; private bucket | 0% | Stage 4 UI |
| 20 | Client lookup | Staff can **find** a client by National ID or phone (for vetting at the counter). | Query on `idOrPassportNo` / `phone`; permission `client:lookup` | 40% | Dedicated lookup + auth |
| 21 | Suspend / activate client | Staff can **block** a bad client so new bookings are refused; can **reactivate** later. | `ClientStatus`; `setCarClientStatus`; hard-block in `createCarBooking` | 95% | — |
| 22 | Vehicle register | Staff can **add/view** cars: type (saloon, SUV, van, pickup, economy), daily rate, status (parked, hired, …). | `CarVehicle`; `VehicleType`; `/admin/vehicles` | 85% | Edit vehicle UI |
| 23 | Owner register | Staff can **add** car owners: ID, KRA PIN, bank, M-Pesa, next of kin. | `CarOwner`; `createCarOwner`; `/admin/owners` | 75% | Uploads; edit |
| 24 | Owner document uploads | Staff can **upload** logbook and signed agreement privately. | `Attachment` for owner; private storage | 0% | Stage 5 |
| 25 | One owner per vehicle | Each car belongs to exactly one owner; system rejects assigning two owners. | FK `CarVehicle.ownerId` | 90% | — |
| 26 | Owner commission settings | Director sets how that owner is paid: % split, fixed deduction, itemised costs, or a mix. | Replace enum with `commissionConfig` JSON + Zod union (Stage 5) | 25% | JSON model + UI |
| 27 | Create booking | Staff **create** a hire: pick client + car + dates; system counts days and base charge; blocks overlapping dates. | `CarBooking`; `createCarBooking`; `bookingCharge()` | 85% | Booking-confirmed message |
| 28 | Dispatch + dent check | Staff record vehicle condition, then **release** the car (status hired). | `ConditionCheck` stage `DISPATCH`; `dispatchCarBooking` | 80% | — |
| 29 | Check-in + return check | On return, staff record condition, compare to dispatch dents, mark hire finished, free the car. | stage `RETURN`; `checkInCarBooking` | 70% | Dent-diff UI |
| 30 | Extend hire | Staff can **lengthen** the return date and add charge without losing old condition records. | `CarHireExtension`; `extendCarBooking` | 50% | Wire UI on bookings page |
| 31 | Block bad dispatch | System **refuses** dispatching a car already out or unavailable. | Status checks in `dispatchCarBooking` | 80% | — |
| 32 | Base hire charge | Charge = daily rate × hire days (automatic). | `lib/car-hire/calculations.ts` `bookingCharge` | 90% | — |
| 33 | Penalty rules (Director) | Director can **set/change** grace time, late rate (per hour or day), and max cap. New rules apply to future hires only. | `PenaltyRule`; `createPenaltyRule`; settings UI | 60% | `updatedBy` + audit; fail if no active rule |
| 34 | Auto late penalty | At check-in, if late past grace, system **adds** penalty and stores how it was calculated. | `CarPenalty`; `latenessPenalty()`; snapshot `penaltyRuleId` on booking | 75% | Fail-safe when no rule |
| 35 | Who still owes | Show remaining balance: total charge minus successful payments. | `bookingBalance()`; finance / booking UI | 50% | Clear paid/outstanding field in UI |
| 36 | Record payment manually | Staff can **enter** cash/bank/M-Pesa payment against a booking. | `CarPayment`; `recordCarPayment` | 70% | — |
| 37 | M-Pesa STK Push | Staff can **send** a payment prompt to the client’s phone from the booking. | Daraja STK; `app/api/car-hire/mpesa/stk`; `lib/mpesa/daraja.ts` | 35% | Admin UI button; one Daraja helper |
| 38 | M-Pesa auto-reconcile | When Safaricom calls back, payment is marked paid; repeat callbacks do not double-count. | `app/api/mpesa/callback`; unique `mpesaRef` | 50% | Stronger idempotency tests |
| 39 | Owner payout math | For a period, system totals **money received** for that owner’s cars, minus expenses/commission, to get net pay. | `generateOwnerPayout`; `ownerSettlement()` | 45% | Use payments not `totalCharge`; allow negative net |
| 40 | Payout workflow | Draft → approve → mark paid (with date/reference). | `OwnerPayout` `PayoutStatus` | 40% | Paid UI + owner-paid message |
| 41 | Doc expiry tracking | Track insurance/inspection expiry per car; flag when ~7 days left. | `VehicleDocument`; `alertSentAt` | 70% | Exact 7-day boundary tests |
| 42 | Daily scheduler | Background job: hire ending soon (2h), overdue, document expiry. Must use a secret key. | `GET /api/cron/car-hire` + `CRON_SECRET` (503 if unset) | 90% | — |
| 43 | Message queue | Every SMS/email attempt is stored with status (queued / sent / failed). | `MessageLog` | 50% | Delivery worker |
| 44 | Email (Resend) | Prefer email when client has a valid address; branded Doxa emails. | `resend` package; `lib/email/resend.ts` | 10% | Car-hire templates |
| 45 | SMS + Sender ID | If no email, send SMS with company Sender ID. | Env `SMS_*`; gateway client (not built) | 0% | Integrate provider |
| 46 | Send worker | Background process actually sends queued messages and updates status. | Cron or queue draining `MessageLog` | 0% | Stage 11 |
| 47 | Msg: booking confirmed | Client gets confirmation when booking is created. | Template key; queue on `createCarBooking` | 0% | — |
| 48 | Msg: vehicle dispatched | Client gets reg no., return time, payment info when car leaves. | Template `vehicle_dispatched` (queued today) | 40% | Actually send |
| 49 | Msg: payment received | Client gets receipt including M-Pesa reference. | Manual path queues; callback must too | 30% | Callback + send |
| 50 | Msg: hire ending soon | Reminder ~2 hours before return time. | Cron template `hire_ending_soon` | 40% | Send |
| 51 | Msg: vehicle overdue | Alert when past return time. | Cron + status `OVERDUE` | 40% | Send |
| 52 | Msg: vehicle returned | Confirmation after check-in. | Template `vehicle_returned` | 40% | Send |
| 53 | Msg: owner paid | Notify owner when payout marked paid. | Template on payout PAID | 0% | — |
| 54 | Msg: document expiring | Alert Director 7 days before insurance/inspection ends. | Cron `document_expiry` | 40% | Send |
| 55 | Bulk SMS to clients | Director can message a filtered group of clients. | `Broadcast` + `MessageLog` children | 5% | UI + worker |
| 56 | Broadcast to owners | Same for owners. | `BroadcastAudience.OWNERS` | 5% | UI + worker |
| 57 | Report: owner payouts | Download payout summary as PDF and Excel. | Server PDF/Excel; permission `report:export` | 0% | Stage 12 |
| 58 | Report: owner statement | One owner’s statement for a period. | Same | 0% | — |
| 59 | Report: revenue by vehicle | Income per car. | JOIN queries | 0% | — |
| 60 | Report: revenue by month | Income by month. | Same | 0% | — |
| 61 | Report: expenses by vehicle | Costs per car. | Same | 0% | — |
| 62 | Report: outstanding balances | Who still owes money. | Partial CSV today | 15% | PDF/Excel |
| 63 | Report: booking history | Full hire history export. | CSV exists | 20% | PDF/Excel |
| 64 | Report: invoice / receipt | Client-facing invoice and payment receipt. | `lib/pdf/receipt.ts` hire receipt scaffold | 5% | Full product |
| 65 | Report: hire agreement | Printable hire agreement PDF. | Template + approved wording | 0% | Client wording |
| 66 | Secure exports | Only logged-in allowed staff can download reports (no open links). | Guard `/api/export/car-hire` + hide Export UI without `report:export` | 90% | — |
| 67 | Director dashboard | First screen: cars out, idle, due today, overdue, money today/month, who owes, docs expiring. | `app/admin/(app)/page.tsx` Prisma aggregates | 75% | Widget unit tests |
| 68 | Dashboard refresh | After a new booking/payment, figures update when you refresh the page. | Server Components revalidate | 60% | Optional live later |
| 69 | Import old lists | One-time load of existing vehicle/owner/client lists from Word/paper into the system. | Import scripts + same Zod as UI | 0% | Stage 14 |
| 70 | Production deploy | Live site on Vercel + Supabase with HTTPS and DNS. | Vercel; env production; domain | 10% | Go-live checklist |
| 71 | Training & UAT | Train Director, Clerk, Yard, Accountant; get sign-off. | UAT scripts; Playwright green | 0% | Stage 16 |
| 72 | Security hardening | Final check: private files, no leaked secrets, HTTPS, audits on. | SEC-1…7 checklist | 15% | Stage 15 |

**Rough overall:** ~45% — booking/CRUD + Stage 3 enforcement ahead; messaging send, reports behind.

---



# Staged implementation plan

Stages are dependency-ordered. Advance when **Test criteria** pass. Update the inventory **Done %** as you go.

---



## Stage 0 — Repo hygiene and test foundation



### Purpose

Stop shipping on `db:push` alone; give every later stage a seed and a test runner.

### Outstanding work

- Fix `.gitignore` (`.next`, env, caches)
- Baseline Prisma migration from current schema
- Vitest (port calculation tests) + Playwright smoke
- Sentry + env Zod validation at boot
- Car-hire seed (staff, fleet, clients, rules, sample bookings)



### Approach

1. Ignore build artefacts; commit a baseline migration.
2. Add `npm test` / Playwright scripts.
3. Seed known fixtures used by later tests.
4. Fail boot if critical secrets missing in production.



### Security risk and fix


| Risk                         | Fix                                                                         |
| ---------------------------- | --------------------------------------------------------------------------- |
| Secrets or `.next` committed | Strict gitignore; never commit `.env.local`                                 |
| Dev accounts usable in prod  | Gate DevAccountsDropdown to non-production only (already intended — verify) |




### Test criteria

- [ ] Migrate applies on empty DB
- [ ] Vitest green for hire/penalty math
- [ ] Playwright smoke hits login
- [ ] Forced error visible in Sentry (staging)
- [ ] Client bundle has no service-role / Daraja secrets
- [ ] Seed counts are deterministic

---



## Stage 1 — Legacy conversion (car-hire only)



### Purpose

Remove SACCO/member logic. Keep only pieces that map to car hire.

### Outstanding work

**Convert:** AuditLog; Document → Attachment; Announcement → Broadcast; members → staff actions; private upload helper; RolesAccessForm shape; receipt PDF scaffold; session fast path.

**Delete:** Contribution, Welfare, Meeting, Project, Gallery, Event, EmailLog; Role enum SECRETARY/TREASURER/…; register-as-member; `/dashboard/`* homes; demo data arrays.

### Approach

1. Schema migration for Attachment + Broadcast; drop legacy tables.
2. Grep gate: no Contribution/Welfare/Meeting/Gallery/SECRETARY left in app code.
3. Rewrite seed/README for car-hire roles only.
4. Private storage SQL for client/owner docs.



### Security risk and fix


| Risk                                                 | Fix                                |
| ---------------------------------------------------- | ---------------------------------- |
| Public gallery `getPublicUrl` pattern reused for IDs | Private buckets + signed URLs only |
| Open `/api/auth/register` for staff                  | Remove; admin invites staff        |




### Test criteria

- [ ] App builds; `/admin/login` works
- [ ] Grep gate clean
- [ ] No public upload path for ID/licence
- [ ] Migrate + seed green

---



## Stage 2 — Dynamic RBAC (one shell)



### Purpose

Permissions fixed in code; Super Admin creates roles and assigns **one role per user** by email. Everyone uses `/admin` — nav/widgets change by permission. Design: [ARCHITECTURE.md](ARCHITECTURE.md) Part C.

### Outstanding work

- Tables: Permission, Role, RolePermission, RbacMeta; `User.roleId` (drop enum role / dashboardAccess)
- Registry + sync; `requirePermission`; nav + widget maps
- Role editor + staff assign-by-email (replace demo page)
- Lockout guards; role delete blocked while assignees; seed 4 SDD roles
- CI test: every server action/route must call `requirePermission` (allowlist public)



### Approach

1. Drop `User.role` / `dashboardAccess`; add `User.roleId` → Role.
2. JWT: `roleId` + `rbacVersion` — not full permission list.
3. Superadmin audited bypass; never invent permission keys in UI.
4. One `/admin` shell — filter sidebar/widgets/buttons by permissions (no per-role folders).



### Security risk and fix


| Risk                                        | Fix                                                     |
| ------------------------------------------- | ------------------------------------------------------- |
| UI-only hiding of nav                       | Server `requirePermission` on every mutation            |
| Stale JWT keeps revoked access              | Permissions not in JWT; bump `rbacVersion` on role edit |
| Admin locks self out of role editor         | Block removing own `staff:role:assign`                  |
| No last superadmin / delete role with users | Enforce ≥1 superadmin; reassign before delete           |




### Test criteria

- [ ] Assign email → one role → correct permission set
- [ ] Role edit invalidates cache without re-login
- [ ] Role with assignees cannot be deleted
- [ ] Self-lockout blocked; Super Admin not deletable
- [ ] Deactivated user cannot get ACTIVE session
- [ ] Unguarded-action CI test fails if guard missing

---



## Stage 3 — Enforcement retrofit



### Purpose

Wire every existing car-hire surface to RBAC; close critical open endpoints.

### Outstanding work

- ~~Guard all `app/actions/car-hire.ts` actions~~
- ~~Lock `/api/export/car-hire` and STK car-hire API~~
- ~~Cron: require `CRON_SECRET` (fail closed)~~
- `writeAudit` + `updatedBy` on penalty/role/money changes
- Layout/session identity (no hardcoded Super Admin)



### Approach

1. Map each action → permission key; deny with 403.
2. Fix export first (national IDs).
3. Page URL checks for Director-only settings.



### Security risk and fix


| Risk                                          | Fix                                            |
| --------------------------------------------- | ---------------------------------------------- |
| **Unauthenticated CSV export of clients/IDs** | `requirePermission('report:export')` + session |
| Cron callable by anyone if secret unset       | Mandatory bearer; 503 if secret missing        |
| Yard Staff hits Director settings by URL      | Server deny + permission on page data load     |




### Test criteria

- [x] Export without auth → 401
- [x] Yard Staff cannot edit penalty rules via action (`settings:penalty_rules:edit`)
- [x] Staff without `payment:stk` / `owner:payout` cannot call those actions/APIs
- [ ] Audit row on penalty change
- [x] Direct `/admin/staff` without `staff:view` blocked
- [x] Suspended client hard-blocked on `createCarBooking`

---



## Stage 4 — Clients



### Purpose

Full client record, private uploads, staff lookup, suspend.

### Outstanding work

- Zod phone/ID rules; Attachment uploads for ID + licence
- Lookup by National ID / phone
- Suspended clients cannot start bookings



### Approach

1. Forms + server validation sharing Zod.
2. Upload via `lib/storage/upload.ts` to private bucket.
3. Lookup endpoint/action with `client:lookup`.



### Security risk and fix


| Risk                   | Fix                                    |
| ---------------------- | -------------------------------------- |
| Public URL to ID scan  | Private bucket; short-lived signed URL |
| Unauthenticated lookup | Auth + `client:lookup`                 |
| PII in exports         | Same as Stage 3 export guard           |




### Test criteria

- [ ] Zod rejects bad phone/ID
- [ ] Upload not publicly readable
- [ ] Lookup by ID and phone correct
- [ ] Unauth lookup rejected
- [ ] Suspended flagged; new booking blocked

---



## Stage 5 — Fleet and owners



### Purpose

Vehicles, owners, uploads, commission config for all 4 SDD shapes.

### Outstanding work

- Owner/vehicle polish + private uploads
- Replace commission enum with `commissionConfig` JSON + Zod union
- Snapshot config on payout rows (for Stage 9)
- Migration of existing commission fields



### Approach

1. Discriminated union: percentage | fixed | itemised | combination.
2. One owner per vehicle (keep FK).
3. Fleet register shows owner.



### Security risk and fix


| Risk                            | Fix                                       |
| ------------------------------- | ----------------------------------------- |
| Logbook/agreement public        | Private Attachment only                   |
| Commission change without audit | `writeAudit` + `settings:commission:edit` |




### Test criteria

- [ ] Vehicle type enum validated
- [ ] All 4 commission shapes accepted
- [ ] Uploads private
- [ ] Dual owner assignment rejected
- [ ] Config snapshot field present on payout model

---



## Stage 6 — Booking, dispatch, check-in



### Purpose

Harden the hire loop; ship extension UI and condition diff.

### Outstanding work

- Condition diff (new dents)
- Extend-hire UI
- Harden dispatch/check-in edge cases
- Queue booking-confirmed in Stage 11 (stub OK)



### Approach

1. Compare return dents_notes / checklist to dispatch stage.
2. Wire `extendCarBooking` in bookings UI.
3. Keep transactional status transitions.



### Security risk and fix


| Risk                         | Fix                                    |
| ---------------------------- | -------------------------------------- |
| Anyone can dispatch/check-in | `booking:dispatch` / `booking:checkin` |
| Condition photo leaks        | Private Attachment                     |




### Test criteria

- [ ] Days calc: same-day, month boundary, leap year
- [ ] Diff flags new dents
- [ ] E2E: book → dispatch check → dispatch → return check → returned
- [ ] Extension updates charges; history intact
- [ ] Re-dispatch rejected

---



## Stage 7 — Charge engine and penalty rules



### Purpose

Director-configurable penalties; full traceability; no silent null rule.

### Outstanding work

- Settings UI; prospective-only application
- Fail booking create if no active rule (or explicit policy)
- Audit + updatedBy
- Outstanding balance field wired for Stage 8



### Approach

1. Snapshot `penaltyRuleId` on booking at create.
2. Check-in uses **that** rule, not “whatever is active now”.
3. New rule only affects new bookings.



### Security risk and fix


| Risk                                | Fix                                         |
| ----------------------------------- | ------------------------------------------- |
| Clerk edits penalty rates           | Director-only `settings:penalty_rules:edit` |
| Silent no-penalty when rule missing | Reject booking create without active rule   |
| No accountability                   | Audit every rule change                     |




### Test criteria

- [ ] Base charge × rates correct
- [ ] Within grace → no penalty
- [ ] Boundary / cap / hour vs day correct
- [ ] Rule change does not alter old completed penalties
- [ ] Penalty row has rule_id + notes
- [ ] Create without active rule fails safely

---



## Stage 8 — M-Pesa and reconciliation



### Purpose

STK from UI; idempotent callback; outstanding balances.

### Outstanding work

- One Daraja client (`MPESA_ENV`)
- Booking UI STK
- Idempotent callback on mpesa_ref / checkoutId
- Failed/pending cleanup



### Approach

1. Create PENDING `CarPayment` → STK → callback COMPLETED/FAILED.
2. Duplicate callback = no-op success.
3. Secrets server-only.



### Security risk and fix


| Risk                          | Fix                                            |
| ----------------------------- | ---------------------------------------------- |
| Double credit on Daraja retry | Unique mpesa_ref + idempotent handler          |
| STK without auth              | Session + `payment:stk`                        |
| Credentials in client         | Never `NEXT_PUBLIC_` for Daraja secrets        |
| Forged callbacks              | Validate Daraja payload; optional IP allowlist |




### Test criteria

- [ ] Success + failure payload parse
- [ ] Duplicate callback safe
- [ ] Sandbox: STK → paid
- [ ] Cancel/fail → unpaid
- [ ] No secrets in client build

---



## Stage 9 — Owner settlement



### Purpose

Correct payouts from money actually received; all commission shapes.

### Outstanding work

- Gross = completed payments for owner’s vehicles in period
- Remove `Math.max(0, netPay)` hide; show amount owed if negative
- Recurring deduction once per period
- Config snapshot; paid notification hook for Stage 11



### Approach

1. Rewrite `ownerSettlement` + `generateOwnerPayout`.
2. Upsert idempotent on period key.
3. Status DRAFT → APPROVED → PAID.



### Security risk and fix


| Risk                                | Fix                                           |
| ----------------------------------- | --------------------------------------------- |
| Clerk runs payouts                  | `owner:payout` permission                     |
| Tampering historical paid statement | Immutable snapshot; no silent rewrite of PAID |




### Test criteria

- [ ] Net matches hand calc for all 4 configs
- [ ] Unpaid bookings excluded from gross
- [ ] Recurring deduction not duplicated on re-run
- [ ] Config change does not alter PAID statements
- [ ] Negative net visible

---



## Stage 10 — Document expiry and cron



### Purpose

Exact 7-day alerts; harden scheduler auth.

### Outstanding work

- Boundary tests; `alertSentAt` dedupe
- Manual cron trigger for QA
- Mandatory CRON_SECRET



### Approach

1. Daily job; alert when expiry in [now, now+7d] and not yet alerted.
2. Fail closed without secret.



### Security risk and fix


| Risk                                  | Fix                    |
| ------------------------------------- | ---------------------- |
| Open cron flips OVERDUE / spams queue | Bearer required always |




### Test criteria

- [ ] Fires at 7 days, not 6 or 8
- [ ] No duplicate daily alert
- [ ] Manual trigger on fixture works once
- [ ] Bad/missing secret → 401

---



## Stage 11 — SMS, email, all triggers



### Purpose

Actually send messages; complete 8 triggers + bulk/broadcast.

### Outstanding work

- Resend car-hire templates; SMS provider
- Worker drains MessageLog
- Channel picker (email if valid else SMS)
- Triggers 47–54; Broadcast bulk/owners
- Payment-received on M-Pesa callback



### Approach

1. Queue on event; worker sends; status SENT/FAILED + error.
2. Templates with interpolation checks.



### Security risk and fix


| Risk                      | Fix                                                    |
| ------------------------- | ------------------------------------------------------ |
| Bulk SMS to wrong segment | Permission `message:broadcast`; confirm filter preview |
| PII in logs               | Redact phone/email in non-prod logs                    |
| HTML injection in email   | Escape all interpolated fields                         |




### Test criteria

- [ ] Channel edge cases: null, empty, bad email → SMS
- [ ] No leftover `{{placeholders}}`
- [ ] All 8 triggers verified in sandbox
- [ ] Bulk/broadcast reach only intended recipients
- [ ] FAILED rows not silent

---



## Stage 12 — PDF and Excel reports



### Purpose

Nine reports, both formats, authorized.

### Outstanding work

Rows 57–65 in inventory; branded PDF; typed Excel numbers.

### Approach

1. Shared query layer; pdf-lib + Excel lib.
2. Every export behind `report:export`.



### Security risk and fix


| Risk                  | Fix                                            |
| --------------------- | ---------------------------------------------- |
| Open export endpoints | Auth + permission (same class as Stage 3)      |
| Invoice IDOR          | Scope by permission; no guessable public links |




### Test criteria

- [ ] Totals match seed
- [ ] PDF + Excel for all 9
- [ ] Excel numbers typed
- [ ] Unauthorized → 401/403

---



## Stage 13 — Director dashboard



### Purpose

Prove eight widgets against seed; fix date windows.

### Outstanding work

- Unit tests per widget query
- “Money today/month” not all-time
- Session-based header (not hardcoded)



### Approach

1. Extract query functions; test with seed.
2. Document refresh behaviour.



### Security risk and fix


| Risk                                | Fix                                           |
| ----------------------------------- | --------------------------------------------- |
| Money widgets visible to Yard Staff | `dashboard:view` / finance-scoped permissions |




### Test criteria

- [ ] Each widget matches seed
- [ ] Today filter correct
- [ ] Refresh shows new payment/booking

---



## Stage 14 — Data migration



### Purpose

Import existing Word/paper lists safely.

### Outstanding work

- Import scripts; dry-run; Zod; idempotent keys (reg, national ID, phone)



### Approach

1. CSV/JSON intermediate from client files.
2. Same validators as UI.



### Security risk and fix


| Risk                       | Fix                |
| -------------------------- | ------------------ |
| Import bypasses validation | Reuse Zod only     |
| Import endpoint public     | Admin-only + audit |




### Test criteria

- [ ] Dry-run counts match (or logged diffs)
- [ ] Rows pass Zod
- [ ] Spot-check vs source
- [ ] Re-run no duplicates

---



## Stage 15 — Security hardening



### Purpose

Whole-system SEC checklist before UAT.

### Outstanding work

- Probe all Storage URL patterns
- Production bundle secret scan
- HTTPS / mixed content
- Confirm audits live
- Document Controller (Doxa) / Processor (SpectreTech)



### Approach

1. Checklist SEC-1…SEC-7.
2. Fix any Stage 0–14 leftovers.



### Security risk and fix


| Risk                      | Fix                                 |
| ------------------------- | ----------------------------------- |
| Residual public buckets   | Make private; rotate if ever leaked |
| Undocumented access paths | Inventory routes; remove dead APIs  |




### Test criteria

- [ ] Unauth Storage access blocked
- [ ] Zero secrets in client bundle
- [ ] HTTPS only
- [ ] Audit on penalty/commission/role edits confirmed

---



## Stage 16 — Regression, UAT, go-live



### Purpose

Full suite green; train 4 roles; deploy; handover.

### Outstanding work

- Playwright across critical paths; bugfix
- Training; Vercel+Supabase; DNS
- Handover pack: code, DB, credentials, docs



### Approach

1. Staging = production-like.
2. UAT Director + Clerk + Yard + Accountant.
3. Sign-off or review window.



### Security risk and fix


| Risk                                 | Fix                                 |
| ------------------------------------ | ----------------------------------- |
| Prod with CRON_SECRET / Daraja unset | Deployment checklist blocks go-live |
| Seed passwords in prod               | Rotate; disable DevAccounts         |




### Test criteria

- [ ] Playwright + Vitest green on staging
- [ ] UAT by 4 roles
- [ ] Performance OK on realistic volume
- [ ] All 20 SDD deliverables checked (map below)
- [ ] No critical defects; client sign-off

---



# Deliverables checklist (SDD §12)


| #   | Deliverable                   | Inventory rows | Stage  |
| --- | ----------------------------- | -------------- | ------ |
| 1   | Director Dashboard            | 67–68          | 13     |
| 2   | Client Management & Lookup    | 18–21          | 4      |
| 3   | Owner Management              | 23–26, 39–40   | 5, 9   |
| 4   | Vehicle / Fleet Register      | 22, 25         | 5      |
| 5   | Booking & Dispatch            | 27–28, 31      | 6      |
| 6   | Check-in & Condition Checks   | 29–30          | 6      |
| 7   | Charge Engine & Penalty Rules | 32–34          | 7      |
| 8   | Role-Based Access Control     | 12–16          | 2–3    |
| 9   | Document / File Storage       | 11, 19, 24     | 1, 4–5 |
| 10  | Authentication System         | 4, 16          | 0–3    |
| 11  | M-Pesa Payment Integration    | 37             | 8      |
| 12  | Payment Reconciliation        | 38, 35–36      | 8      |
| 13  | Owner Payout & Statements     | 39–40, 57–58   | 9, 12  |
| 14  | SMS Automation                | 45–46, 47–54   | 11     |
| 15  | Email Automation              | 44, 46–54      | 11     |
| 16  | Bulk SMS & Owner Broadcast    | 55–56          | 11     |
| 17  | Document Expiry Alerts        | 41–42, 54      | 10–11  |
| 18  | PDF & Excel Reports           | 57–66          | 12     |
| 19  | Data Migration                | 69             | 14     |
| 20  | Deployment, Training & Source | 70–72          | 16     |


---



# Cross-cutting (every stage)

1. Financial math must store the rule/config used (penalty rule_id; commission snapshot).
2. New actions after Stage 3 must call `requirePermission` (CI enforces).
3. No hardcoded penalty/commission/role matrices in business logic.
4. Update **Done %** in the inventory when a feature ships — demo UI ≠ 100%.

---

Prepared by **SpectreTech Limited** · Doxa Car Hire · SP-DOXA-2026-001