# Doxa Car Hire Management System

**Fleet, Booking, Owner Settlement & Automated Communication Platform**

| | |
|---|---|
| **Client** | Doxa Motor Solutions — Roysambu, Nairobi |
| **Prepared by** | SpectreTech Limited |
| **Project reference** | SP-DOXA-2026-001 |
| **Source** | Solution Design Document v1.0 (27 July 2026) |
| **Programme** | 6 weeks (27 July 2026 – 7 September 2026) |
| **Dev server** | [http://localhost:3002](http://localhost:3002) |

| Doc | Purpose |
|-----|---------|
| **This README** | System purpose, requirements, workflows, delivery |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | **Architecture + backend setup + RBAC** (one doc) |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Feature inventory (plain English + technical, % done) + stages |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Tables, relationships, ERD, seed accounts |
| [docs/DESIGN.md](docs/DESIGN.md) | UI / design tokens |
| [docs/SECURITY.md](docs/SECURITY.md) | Suspicious-delete scoring, alerts, risk score |
| Settings / Loyalty | `/admin/settings` — category start prices + loyalty metrics (editable) |

---

## 1. System purpose

Doxa Motor Solutions is a Nairobi-based car hire business operating a mixed fleet — vehicles owned directly and vehicles placed on the fleet by third-party car owners. Operations today rely on bank credit alerts, paper, and Word documents.

This platform replaces that with a connected digital system that:

- Manages the full hire lifecycle: **booking → dispatch → active hire → check-in → settlement**
- Automatically computes hire charges and lateness penalties using **client-configurable rules** (not hardcoded)
- Calculates car owner earnings, deducts agreed expenses, and produces owner statements / payout reports
- Triggers automated SMS and email at every lifecycle stage
- Prompts clients for M-Pesa payment (STK Push) and reconciles paid vs unpaid
- Tracks vehicle document expiry (insurance & inspection) with advance warnings
- Gives the Director a single dashboard for fleet status, money collected, outstanding balances, and expiring documents
- Supports instant client lookup by **National ID** or **phone number**

**Guiding principle:** the system should not merely store records — it should compute charges, calculate owner payouts, and dispatch the right message to the right person at the right time, so the director can run the business from anywhere with minimal manual work.

### Security & loyalty (admin)

- **Security:** Suspicious delete scoring emails Super Admins / test inbox when a staff risk score rises. Details: [docs/SECURITY.md](docs/SECURITY.md).
- **Loyalty:** Points = category base + pts/day × days + hire amount + return rating bonus. Awarded only when the hire is **returned**, **balance is 0**, and the client is **active**. Suspended clients’ points drop to **0**. Configure metrics and category start prices under **Settings** (`/admin/settings`).

---

## 2. Quick start

### Windows PowerShell

If PowerShell blocks `npm.ps1`, use the included Command Prompt launchers:

```powershell
.\setup.cmd
.\dev.cmd
```

Or call npm’s Windows executable:

```powershell
npm.cmd run dev
```

### Setup

```bash
npm install
copy .env.local.example .env.local   # fill secrets — see docs/ARCHITECTURE.md Part B
npm run db:generate
npm run db:push                      # or db:migrate after baseline resolve
npm run db:seed
npm run db:bootstrap-auth
npm run db:test
npm run dev                          # http://localhost:3002
npm test                             # Vitest
```

Full setup: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** (Part B).  
Seed login accounts: **[docs/DATA_MODEL.md](docs/DATA_MODEL.md#seeded-dev-accounts)**

### Useful scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server → **:3002** |
| `npm run build` / `start` | Production build / start (:3002) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Sync schema to Supabase |
| `npm run db:migrate` | Versioned migrations |
| `npm run db:seed` | Seed Prisma data |
| `npm run db:bootstrap-auth` | Create/link Supabase Auth users |
| `npm run db:test` | Connection smoke test |
| `npm run db:studio` | Prisma Studio |

---

## 3. Functional requirements

### 3.1 Client & booking management

| ID | Requirement |
|----|-------------|
| FR-2.1.1 | Client registration captures: full name, phone, email, National ID or passport, ID copy, driving licence number & copy, physical address, next of kin / emergency contact, employer details, second contact person |
| FR-2.1.2 | Client lookup by **National ID** or **phone**, restricted to authenticated staff |
| FR-2.1.3 | Client accounts support **suspend** and **activate** |
| FR-2.1.4 | Booking creation, vehicle dispatch, hire extension, vehicle check-in |
| FR-2.1.5 | Dent / condition checks at **dispatch** and **return**; return compared against dispatch |

### 3.2 Fleet & owner management

| ID | Requirement |
|----|-------------|
| FR-2.2.1 | Vehicle types: saloon, SUV/4x4, van/minibus, pickup, economy — each with per-day rate |
| FR-2.2.2 | Owner records: full name, phone, National ID, KRA PIN, logbook copy, bank details, M-Pesa number, signed agreement, next of kin |
| FR-2.2.3 | Each vehicle assignable to exactly one owner |
| FR-2.2.4 | Track owner earnings and expenses; compute net payout automatically |
| FR-2.2.5 | Generate owner statements and payout reports on demand and on schedule |

### 3.3 Charges, penalties & payments

| ID | Requirement |
|----|-------------|
| FR-2.3.1 | Base charge = per-day rate × hire days (automatic) |
| FR-2.3.2 | Lateness penalty applies automatically when actual return exceeds agreed end time |
| FR-2.3.3 | Penalty rules **Director-configurable**: grace period, rate (per hour or day), maximum cap |
| FR-2.3.4 | Rule changes apply **prospectively only** (no retroactive recalculation) |
| FR-2.3.5 | Every applied penalty stores rule + values used (full calculation trail) |
| FR-2.3.6 | M-Pesa STK Push + Paybill reconciliation |
| FR-2.3.7 | Running, queryable record of paid vs outstanding bookings |

### 3.4 Document expiry tracking

| ID | Requirement |
|----|-------------|
| FR-2.4.1 | Track insurance and inspection certificate expiry per vehicle |
| FR-2.4.2 | Advance alert **7 days before expiry** (Director SMS/email + dashboard) |
| FR-2.4.3 | Expiry checks run on a **daily schedule** |

### 3.5 Automated communication

| Trigger | Message |
|---------|---------|
| Booking created | Booking confirmed |
| Vehicle dispatched | Dispatch details, return date, payment details |
| Payment received | Payment received, with M-Pesa reference |
| 2 hours before end of hire | Hire ending soon |
| Past the end time | Vehicle overdue |
| Vehicle returned | Return confirmation |
| Owner paid | Owner payout notification |
| 7 days before document expiry | Insurance / inspection expiring |

- Prefer **email** when a client email exists; otherwise **SMS** (Sender ID always available).
- Support **bulk SMS** to clients and **broadcast messaging** to owners.

### 3.6 Staff & access control

Minimum three concurrent staff logins across four starting roles (permissions **server-side**, configurable):

| Role | Responsibilities |
|------|------------------|
| **Director / Owner** | Full dashboard, all money, all reports, owner settlement, staff management, message controls, system settings (penalty & commission) |
| **Office Clerk / Receptionist** | Register clients, create bookings, dispatch vehicles, generate receipts |
| **Yard Staff** | Release / receive vehicles; dent & condition checks at dispatch and return |
| **Accountant / Bookkeeper** | Record expenses, reconcile payments, owner statements and financial reports |

### 3.7 Reporting (PDF + Excel)

1. Owner payout report  
2. Individual owner statement  
3. Revenue by vehicle  
4. Revenue by month  
5. Expenses by vehicle  
6. Outstanding client balances  
7. Full booking history  
8. Client invoices and receipts  
9. Hire agreement  

### 3.8 Director dashboard (real-time)

- Cars out on hire now  
- Cars parked and idle  
- Cars due back today  
- Cars overdue  
- Money collected today  
- Money collected this month  
- Who owes money  
- Documents about to expire  

### 3.9 Data migration

One-time import of existing vehicle, owner, and client lists (currently Word / paper). Accuracy depends on source data quality provided by the client.

---

## 4. Out of scope

Excluded unless approved by written Change Request:

- GPS vehicle tracking  
- WhatsApp messaging  
- Native mobile app (mobile-**responsive** web only at launch)  
- Card payment processing  
- Loyalty schemes / promotions  
- Accounting-package integration  
- 24-hour support / infrastructure management after handover  
- Third-party usage costs (Sender ID, SMS, payment gateway, email) — borne by the client  

---

## 5. Architecture

### 5.1 Stack

| Layer | Technology | Role |
|-------|------------|------|
| Framework | Next.js (App Router) + TypeScript | Full-stack SSR UI + API |
| UI | Tailwind CSS (+ shadcn/ui direction) | Branded blue & white UI |
| ORM | Prisma | Typed Postgres access, migrations |
| Validation | Zod | Forms + API boundary validation |
| Database | Supabase PostgreSQL | System of record |
| Auth | Supabase Auth | Staff login + RBAC |
| Storage | Supabase Storage | ID / licence / logbook / agreements |
| Email | Resend | Transactional + bulk email |
| SMS | SMS gateway + Sender ID | Automated + bulk branded SMS |
| Payments | M-Pesa Daraja | STK Push + callback reconciliation |
| Automation | Cron / scheduled jobs | Reminders, overdue, expiry, statements |
| Reports | pdf-lib + Excel/CSV export | PDF and spreadsheet reports |
| Deploy | Vercel (or Netlify) + Supabase | App + data hosting |
| Monitoring | Sentry | Error tracking |

### 5.2 Layered view

```
Director / Staff / Client (Browser · Mobile web)
                │
    Next.js (App Router)
    Server Components + Route Handlers / Actions
    Tailwind UI
                │
    Prisma ORM · Zod schemas
    charges · payouts · reconciliation · messaging
                │
   ┌────────────┼────────────┐
   │            │            │
Supabase    Job Scheduler   Supabase Storage
PostgreSQL  (cron)          ID / licence / logbook
                │
   ┌────────────┼──────────┬─────────────┐
   │            │          │             │
Supabase     Resend    SMS Gateway   M-Pesa Daraja
Auth/RBAC    email     + Sender ID   STK Push
```

### 5.3 Project map

```
app/
  admin/             # ONE shell for all staff — nav/widgets by permission
  auth/callback/     # OAuth / magic-link exchange
  api/               # auth, mpesa, export, cron
components/          # auth, admin UI, brand
lib/                 # prisma, auth, rbac, car-hire, email, mpesa
prisma/              # schema + migrations + seed
supabase/            # policies.sql, storage.sql
docs/                # architecture, RBAC, implementation plan
scripts/             # db helpers, bootstrap-auth
```

Diagrams and run commands: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## 6. Roles & access (permission shell)

Do **not** build a separate dashboard per role. Everyone logs into `/admin`.

| Idea | Rule |
|------|------|
| Permissions | Fixed in code (`booking:dispatch`, `client:lookup`, …) |
| Roles | Super Admin creates bundles (Director, Clerk, Yard, Accountant, custom…) |
| Users | Assign **one role** by email — no per-user permission lists |
| Shell | Sidebar / widgets / buttons filtered by permissions |
| Security | `requirePermission` on every server action — hiding nav is not enough |

Full design: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** Part C (RBAC).

### Auth flow

1. Admin invites staff (no public self-register for staff)
2. Login at `/admin/login`
3. Middleware requires authenticated `ACTIVE` session for `/admin/*`
4. Layout loads role → permissions → filters shell
5. Suspended / inactive users are signed out

---

## 7. Data model (minimum entities)

Prisma models with Zod at the boundary. Full detail: **[docs/DATA_MODEL.md](docs/DATA_MODEL.md)**.

| Entity | Key fields |
|--------|------------|
| **owners** | id, full_name, phone, national_id, kra_pin, logbook_url, bank_details, mpesa_number, agreement_url, next_of_kin, commission_config, created_at |
| **vehicles** | id, owner_id, reg_no, description, type, daily_rate, status, insurance_expiry, inspection_expiry |
| **clients** | id, full_name, phone, email, id_or_passport_no, id_copy_url, licence_no, licence_copy_url, address, next_of_kin, employer, second_contact, status, created_at |
| **bookings** | id, client_id, vehicle_id, start_date, end_date, days, base_charge, status, created_by, created_at |
| **condition_checks** | id, booking_id, stage (dispatch / return), dents_notes, components_ok, checked_by, created_at |
| **penalty_rules** | id, name, grace_period, rate, rate_unit (hour / day), cap, active, updated_by, updated_at |
| **penalties** | id, booking_id, rule_id, hours_late, amount, calculation_notes |
| **payments** | id, booking_id, amount, method, mpesa_ref, status, paid_at |
| **expenses** | id, vehicle_id, owner_id, description, amount, period, created_at |
| **owner_payouts** | id, owner_id, period, gross_earnings, total_expenses, net_pay, status, paid_at |
| **messages** | id, recipient_type, recipient_id, channel (sms / email), template, status, sent_at |
| **users** | id, name, email, role, active, created_at |
| **documents** | id, vehicle_id, type (insurance / inspection), expiry_date, alert_sent |

Must support JOIN-based reporting: revenue by vehicle / month, owner statements, outstanding balances, full booking history.

---

## 8. Core workflows

### 8.1 Booking & dispatch

1. Client requests a car; staff verify driving licence.  
2. Client visits for vetting.  
3. Documentation: new client or lookup by National ID / phone.  
4. Payment via M-Pesa STK Push or Paybill; system reconciles and marks paid.  
5. Dent / condition check (dispatch stage).  
6. Dispatch → client gets reg no., hire period, return date, payment details; Director notified (dispatch + payment + remaining fleet).

### 8.2 Return & check-in

1. Yard staff compare return condition to dispatch record.  
2. Confirm components OK.  
3. Mark checked in → system computes final charge including lateness penalty.  
4. Client return confirmation; fleet status updated.

### 8.3 Charge & penalty

- Base = daily rate × days.  
- Lateness uses the **currently active** penalty rule (grace, rate, cap).  
- Changes apply only to future bookings.  
- Store full audit trail (rule ID + values).

### 8.4 Owner settlement

1. Sum earnings for owner’s vehicles over the period.  
2. Subtract expenses / deductions (service, parts, tracking, recurring).  
3. Net = earnings − expenses.  
4. Statement / invoice + owner notification on payout.  
5. Commission config **per owner**: % split, fixed deduction, itemised expenses, or combination.

### 8.5 Communication & document expiry

- Event triggers + daily scheduler (see §3.5 / §3.4).  
- Channel: email if available, else SMS.  
- Document expiry: daily check, 7-day advance alert to Director, dashboard surfacing.

---

## 9. Security & data protection

| ID | Requirement |
|----|-------------|
| SEC-1 | Supabase Auth; role checks **server-side** |
| SEC-2 | All traffic over HTTPS |
| SEC-3 | Scans in access-controlled Storage — never public buckets |
| SEC-4 | API keys / gateway secrets server-side only — never in client bundle or repo |
| SEC-5 | Doxa Motor Solutions = data **Controller**; SpectreTech = **Processor** |
| SEC-6 | National ID / phone lookup limited to authenticated staff |
| SEC-7 | Penalty / commission setting changes logged with user + timestamp |

---

## 10. Non-functional constraints

- **NFR-1** Mobile-first responsive web (no native app).  
- **NFR-2** Brand: blue & white, extension of Doxa Motor Solutions identity.  
- **NFR-3** Reports in both PDF and Excel.  
- **NFR-4** Settlement math uses transactions / FKs — no eventual-consistency shortcuts on money.  
- **NFR-5** Sentry integrated early.  
- **NFR-6** Graceful handling of SMS / email / M-Pesa failures and rate limits.

---

## 11. Delivery plan (6 weeks)

| Phase | Focus | Week | Dates |
|-------|-------|------|-------|
| 1. Setup & Foundation | Repo, env, schema, auth, branded base UI | 1 | 27 Jul – 2 Aug |
| 2. Core Build — Clients, Fleet, Owners | Registers, lookup, document storage | 2 | 3 Aug – 9 Aug |
| 3. Bookings, Dispatch & Charges | Booking, dispatch, check-in, charge engine, penalty rules | 3 | 10 Aug – 16 Aug |
| 4. Payments & Owner Settlement | STK Push, reconciliation, payouts, statements | 4 | 17 Aug – 23 Aug |
| 5. Automation & Reporting | SMS/email, scheduler, Director dashboard, PDF/Excel, migration | 5 | 24 Aug – 30 Aug |
| 6. Testing, Training & Deployment | E2E testing, hardening, training, go-live | 6 | 31 Aug – 7 Sep |

### Client dependencies (blocking)

| When | Required |
|------|----------|
| Week 1 | Branding assets; existing vehicle / owner / client records |
| Week 4 | M-Pesa payment collection details |
| Before go-live | Approved SMS/email templates and hire agreement wording |

Client-caused delay extends the programme by at least the period of delay.

### Cost & payment (contract reference)

| Milestone | When | Amount (KSh) |
|-----------|------|--------------|
| Project commencement | Week 1 — 27 July 2026 | 10,000 |
| Core build underway | Week 2 | 10,000 |
| Development & deployment complete | Week 6 — 7 September 2026 | 20,000 |
| **Total** | | **40,000** |

---

## 12. Deliverables checklist (definition of done)

1. Director Dashboard  
2. Client Management & Lookup  
3. Owner Management  
4. Vehicle / Fleet Register  
5. Booking & Dispatch  
6. Check-in & Condition Checks  
7. Charge Engine & Penalty Rules  
8. Role-Based Access Control  
9. Document / File Storage  
10. Authentication System  
11. M-Pesa Payment Integration  
12. Payment Reconciliation  
13. Owner Payout & Statements  
14. SMS Automation (Sender ID)  
15. Email Automation  
16. Bulk SMS & Owner Broadcast  
17. Document Expiry Alerts  
18. PDF & Excel Reports  
19. Data Migration  
20. Deployment, Training & Source Code  

---

## 13. Acceptance criteria

- Agreed functionality for the milestone delivered  
- No critical defects  
- Production deployment successful where applicable  
- Documentation delivered  
- Review window: **5 business days**; written, itemised rejections only  
- Valid rejections rectified within **10 business days**  
- No compliant rejection within the window = deemed accepted  
- Minor defects that do not block operational use do not delay acceptance  

Post-launch support: **60 calendar days** from go-live for reproducible defects in delivered functionality (new features excluded).

---

## 14. Assumptions & risks

| Item | Note |
|------|------|
| Timely client information | Schedule assumes branding, records, payment details, approvals arrive on time |
| Configurable business rules | Charge / payout accuracy depends on client configuring and maintaining rules |
| Third-party services | SMS, email, and M-Pesa availability depend on external providers |
| Sender ID lead time | Operator registration may affect SMS branding at go-live |
| Data migration quality | Source is Word / paper — accuracy depends on client-provided data |

---

## 15. Seeded dev accounts

> Local / development only. Created by `npm run db:seed` + `npm run db:bootstrap-auth`.

| Email | Password | Staff role | Home |
|-------|----------|------------|------|
| `superadmin@doxacarhire.com` | `SuperAdmin@2026!` | Director (Super Admin) | `/admin` |
| `admin@doxacarhire.com` | `ChangeMe123!` | Director | `/admin` |
| `dispatch@doxacarhire.com` | `ChangeMe123!` | Office Clerk | `/admin` |
| `fleet@doxacarhire.com` | `ChangeMe123!` | Yard Staff | `/admin` |
| `finance@doxacarhire.com` | `ChangeMe123!` | Accountant | `/admin` |

Admin login: `/admin/login`. All active staff use the **same** `/admin` shell (nav filtered by permissions in Stage 2).

In development, focus the email field on the login form to autofill a seed account.

---

## 16. Environment overview

Copy `.env.local.example` → `.env.local`. Required groups:

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, publishable/anon key, `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- **Postgres:** `DATABASE_URL` (pooler), `DIRECT_URL` (migrations)
- **Email:** `RESEND_API_KEY`, `FROM_EMAIL`, optional `RESEND_TEST_EMAIL` (redirects all mail until domain verified)
- **SMS:** `SMS_API_KEY`, `SMS_USERNAME`, `SMS_SENDER_ID`
- **M-Pesa:** Daraja consumer key/secret, shortcode, passkey, callback URL
- **App:** `NEXT_PUBLIC_APP_URL`, cron secrets as needed

Details: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** Part B.

---

Prepared by **SpectreTech Limited** — Reliable Tech Solutions  
Project: **Doxa Car Hire Management System** · SP-DOXA-2026-001 · 27 July 2026
