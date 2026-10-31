# Doxa Car Hire — Architecture, Setup & RBAC

**Project:** SP-DOXA-2026-001 · Doxa Motor Solutions · SpectreTech Limited  
**Aligned with:** Solution Design Document v1.0 — July 2026  

This is the **single** reference for:

1. **System architecture** — how the stack fits together
2. **Backend / env setup** — Supabase, secrets, seed, deploy
3. **RBAC design** — permissions → roles → users · one `/admin` shell

**Related:** [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) · [DATA_MODEL.md](DATA_MODEL.md) · [DESIGN.md](DESIGN.md) · [README](../README.md)

**Dev URL:** [http://localhost:3002](http://localhost:3002)

---



## Contents


| Part | Section                                                       |
| ---- | ------------------------------------------------------------- |
| A    | [System architecture](#a--system-architecture)                |
| B    | [Backend & environment setup](#b--backend--environment-setup) |
| C    | [RBAC design](#c--rbac-design)                                |


---



# A — System architecture



## A1. Run locally (quick)

```bash
npm install
copy .env.local.example .env.local   # fill secrets — see Part B
npm run db:generate
npm run db:migrate                   # prefer migrations over db:push
npm run db:seed
npm run db:bootstrap-auth
npm run dev                          # http://localhost:3002
```


| Command                   | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `npm run dev`             | Next.js frontend + API (App Router) on **:3002** |
| `npm run build` / `start` | Production build / serve                         |
| `npm test`                | Vitest unit tests                                |
| `npx playwright test`     | E2E smoke                                        |
| `npm run db:migrate`      | Apply Prisma migrations                          |
| `npm run db:seed`         | Car-hire fixtures                                |
| `npm run db:studio`       | Browse DB                                        |


There is no separate backend process — **Next.js is the full stack** (UI + route handlers + server actions). Supabase hosts Postgres, Auth, and Storage.

---



## A2. Layered view

```mermaid
flowchart TB
  Browser[Staff browser / mobile web]
  Next[Next.js App Router]
  Actions[Server Actions + Route Handlers]
  RBAC[requirePermission]
  Prisma[Prisma ORM + Zod]
  PG[(Supabase PostgreSQL)]
  Auth[Supabase Auth]
  Store[Supabase Storage private]
  Cron[Cron routes]
  Resend[Resend email]
  SMS[SMS gateway]
  Mpesa[M-Pesa Daraja]

  Browser --> Next
  Next --> Actions
  Actions --> RBAC
  RBAC --> Prisma
  Prisma --> PG
  Next --> Auth
  Actions --> Store
  Cron --> Actions
  Actions --> Resend
  Actions --> SMS
  Actions --> Mpesa
  Mpesa -->|callback| Actions
```



---



## A3. Auth + one admin shell (overview)

```mermaid
flowchart TD
  Login["/admin/login"] --> Supa[Supabase Auth]
  Supa --> Sync[Prisma User + roleId]
  Sync --> Perms[Load Role → Permission set]
  Perms --> Shell["/admin shell"]
  Shell --> Nav[Sidebar by permission]
  Shell --> Widgets[Widgets by permission]
  Shell --> Gate["requirePermission on pages + actions + APIs"]
```



```
Permissions (code registry)  →  Roles (admin UI)  →  Users (one roleId each)  →  one /admin shell
```

Full RBAC detail is in [Part C](#c--rbac-design).

---



## A4. Hire lifecycle

```mermaid
sequenceDiagram
  participant Staff
  participant App as Next.js
  participant DB as Postgres

  Staff->>App: Create booking
  App->>DB: RESERVED + charge snapshot
  Staff->>App: Dispatch + condition check
  App->>DB: DISPATCHED / HIRED + queue message
  Staff->>App: Check-in + return condition
  App->>DB: Penalty if late + RETURNED + AVAILABLE
```



---



## A5. M-Pesa

```mermaid
sequenceDiagram
  participant Staff
  participant App
  participant Daraja
  participant Phone as Client phone

  Staff->>App: STK Push
  App->>DB: CarPayment PENDING
  App->>Daraja: STK
  Daraja->>Phone: Prompt
  Daraja->>App: Callback
  App->>DB: COMPLETED or FAILED idempotent
```



Credentials stay server-side only. Callback must be idempotent on `mpesa_ref`.

---



## A6. Cron + messaging

```mermaid
flowchart LR
  Cron["/api/cron/car-hire"] --> Detect[Ending soon / overdue / doc expiry]
  Detect --> Queue[(MessageLog QUEUED)]
  Events[Dispatch / pay / return] --> Queue
  Worker[Delivery worker] --> Queue
  Worker --> Email[Resend]
  Worker --> SMS[SMS]
```



Cron requires `Authorization: Bearer CRON_SECRET` (fail closed).

---



## A7. API surface (car hire)


| Area      | Examples                                                                |
| --------- | ----------------------------------------------------------------------- |
| Auth      | `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/auth/callback` |
| M-Pesa    | `/api/car-hire/mpesa/stk`, `/api/mpesa/callback`                        |
| Cron      | `/api/cron/car-hire`                                                    |
| Export    | `/api/export/car-hire` (must be authenticated)                          |
| Mutations | Prefer `app/actions/car-hire.ts` server actions over ad-hoc REST        |


---



## A8. Storage

Private buckets for ID copies, licences, logbooks, agreements. Short-lived **signed URLs** only — never public `getPublicUrl` for PII.

---



# B — Backend & environment setup



## B1. Prerequisites

1. Node.js 20+ and npm
2. A [Supabase](https://supabase.com) project
3. A [Resend](https://resend.com) account (optional until email is needed)
4. Optional: Safaricom Daraja sandbox (M-Pesa)
5. Optional: SMS provider (Africa's Talking recommended)

```bash
cd c:\PROJECTS\Doxa
npm install
copy .env.local.example .env.local
npm run dev
```

Open [http://localhost:3002](http://localhost:3002).

---



## B2. Environment variables

Fill `.env.local` (never commit secrets):


| Variable                               | Where                           | Purpose                      |
| -------------------------------------- | ------------------------------- | ---------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase → Settings → API       | Project URL                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same (publishable / anon)       | Browser + SSR                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Same (optional legacy)          | Fallback                     |
| `SUPABASE_SERVICE_ROLE_KEY`            | Same (service_role)             | Server admin only            |
| `DATABASE_URL`                         | Database → pooler / Transaction | Prisma + PgBouncer           |
| `DIRECT_URL`                           | Database → Session / direct     | Migrations / `db:push`       |
| `RESEND_API_KEY`                       | Resend dashboard                | Email notifications          |
| `FROM_EMAIL`                           | Verified sender                 | From address                 |
| `SMS_API_KEY`                          | SMS provider dashboard          | SMS notifications            |
| `SMS_USERNAME`                         | SMS provider                    | Account username             |
| `SMS_SENDER_ID`                        | SMS provider                    | Sender name (e.g. DOXA)      |
| `NEXT_PUBLIC_APP_URL`                  | Your URL                        | e.g. `http://localhost:3002` |
| `MPESA_*`                              | Daraja portal                   | STK Push payments            |
| `CRON_SECRET`                          | You generate                    | Protects cron routes         |
| `SENTRY_DSN`                           | Optional                        | Error tracking               |


Example shapes:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-....pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-....pooler.supabase.com:5432/postgres"
```

Tips:

- Replace `[YOUR-PASSWORD]`; URL-encode special characters.  
- Restart `npm run dev` after env changes.  
- If a secret was ever committed: rotate it and keep `.env.local` gitignored.  
- Placeholders only: `.env.local.example`

---



## B3. Supabase project checklist

1. Create a project (region near Kenya — e.g. `eu-west-1` or `af-south-1`).
2. Copy URL + publishable key + **service role** into `.env.local`.
3. **Authentication → Providers:** enable Email; enable **Google** when ready (see B5).
4. **Authentication → URL configuration:**
  - Site URL: `http://localhost:3002`
  - Redirects: `http://localhost:3002/**`, `http://localhost:3002/auth/callback` (+ production later)

Client files: `utils/supabase/client.ts`, `utils/supabase/server.ts`, `lib/supabase-server.ts`.

---



## B4. Database schema + seed

```bash
npm run db:generate
npm run db:migrate
# Existing DBs already matching schema: npx prisma migrate resolve --applied 00000000000000_baseline
npm run db:seed
npm run db:bootstrap-auth
npm run db:test
```

Seed login accounts (dev only): see [DATA_MODEL.md — Seeded dev accounts](./DATA_MODEL.md#seeded-dev-accounts) and [B9](#b9-rbac-bootstrap).

---



## B5. Google OAuth (optional)

1. Supabase → Authentication → Providers → **Google** → Enable.
2. Google Cloud Console → OAuth 2.0 Client (Web).
3. Authorized redirect: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Paste Client ID / Secret into Supabase.
5. Confirm Site URL + `http://localhost:3002/auth/callback` in Auth URL config.

Staff admin login (`/admin/login`) has no Google button.

**Login throttle:** `/api/auth/login` locks an email+IP after **5** failed passwords for **15 minutes** (`lib/auth/login-throttle.ts`), returns HTTP **429**, and writes `auth.login_failed` / `auth.login` audit rows. This is process-local (warm instances); for multi-region Vercel, pair with Supabase Auth rate limits / a shared store later.

---



## B6. Row Level Security + Storage

After schema apply, in Supabase **SQL Editor**:

1. Run `[supabase/policies.sql](../supabase/policies.sql)`
2. Run `[supabase/storage.sql](../supabase/storage.sql)`

Buckets:

- `car-hire-docs` / private docs — ID copies, licences, logbooks, agreements (max **5 MB**; PDF, Excel, Word, CSV, JPG, PNG; app compresses PDF/images on upload)  
- `vehicles` — authenticated read (vehicle photos)

`storage.sql` sets bucket size/MIME limits and deny-by-default object policies (uploads go through server actions + service role). Re-run it after pulling so the dashboard shows **4 policies** on `car-hire-docs`.

Never put the service role key in browser code.

---



## B7. Resend (email)

1. Create API key → `RESEND_API_KEY`.
2. Verify domain or use Resend test domain locally.
3. Set `FROM_EMAIL` (e.g. `noreply@doxacarhire.com`).
4. Until the domain is verified, set `RESEND_TEST_EMAIL` to your onboarding inbox — booking confirmations and other mail redirect there.
5. Booking confirmation: email sends on create; SMS queues until `SMS_*` keys are set.

Without a key, the app skips sending and continues.

Email triggers (when wired): booking confirmation, return reminder, late return, owner earnings, payment receipt.

---



## B8. SMS (when ready)

1. Sign up at [Africa's Talking](https://africastalking.com).
2. Fill `SMS_API_KEY`, `SMS_USERNAME`, `SMS_SENDER_ID` in `.env.local`.
3. SMS for: booking confirmation, return reminders, payment receipts.

Without SMS keys, the app skips and continues.

---



## B9. RBAC bootstrap

**Plain English:** After the database is ready, seed creates permission keys and the system **Super Admin** role plus **one** staff user. You invite more staff by email and give each person **one role**. Everyone uses the same `/admin` site; the menu only shows what their role allows. The server also blocks unauthorized actions.

**Setup steps**

1. Apply schema that includes `permissions`, `roles`, `role_permissions`, `users.roleId`, `rbac_meta`.
2. Sync permission registry from code → DB (`lib/rbac/registry.ts` via seed).
3. Seed creates the **Super Admin** system role only. Create Clerk / Yard / Accountant (or custom) roles in `/admin/settings` when needed (see [Part C](#c--rbac-design)).
4. `npm run db:seed` then `npm run db:bootstrap-auth` so the Auth user matches the Prisma `User` row.
5. Log in as Super Admin → `/admin/settings` → invite staff / create roles / assign by email.
6. Confirm role menus: e.g. Clerk cannot open Finance exports; Yard cannot edit penalty rules.

**Technical checklist**


| Item                        | Detail                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------- |
| One shell                   | All staff → `http://localhost:3002/admin`                                          |
| Gate                        | Every mutation: `requirePermission('…')`                                           |
| JWT metadata                | `roleId`, `rbacVersion`, `isSuperAdmin`, `status` — **not** full permission arrays |
| Role change                 | Re-sync that user’s Supabase `app_metadata`                                        |
| Permission change on a role | Bump `rbac_meta.version` so caches invalidate                                      |
| Env                         | No extra RBAC secrets; uses same Supabase Auth + Prisma                            |


**Dev seed account** (after bootstrap — change the password in production):

| Email | Role | Password (dev) |
| ----- | ---- | -------------- |
| `superadmin@doxacarhire.com` | Super Admin / Director | `SuperAdmin@2026!` |

No other staff accounts are seeded. Extra roles and users are created in `/admin/settings`.


---



## B10. M-Pesa Daraja (when ready)

1. Fill Daraja credentials in `.env.local` (`MPESA_*`).
2. Deploy somewhere with public HTTPS (Vercel).
3. Set the STK callback URL to your production `/api/mpesa/callback`.
4. Test sandbox STK from the Finance dashboard.

Routes: `app/api/car-hire/mpesa/stk`, `app/api/mpesa/callback`.

---



## B11. Hosting (Vercel + Supabase)

1. Import repo to Vercel; set all env vars.
2. `NEXT_PUBLIC_APP_URL` = production domain.
3. Supabase Auth redirect URLs = production domain.
4. Resend DNS for the sending domain.
5. Migrate / push schema against production.
6. Point M-Pesa callback at production when live.

Shared PHP hosting is not suitable for this stack.

---



## B12. Commands reference

```bash
npm install
npm run dev              # http://localhost:3002
npm run build
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
npm run db:bootstrap-auth
npm run db:test
npm run db:studio
npm test
npm run lint
```

---



# C — RBAC design

**Permissions → Roles → Users · one dashboard shell**  
Referenced from Stage 2 of [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

---



## C1. Mental model

```
Permissions (fixed in code)     ←── developers only — maps to real pages/actions
      ↓
Roles (admin-created)           ←── Super Admin combines existing keys
      ↓
Users (one role each)           ←── assign by email — no per-user permission lists
      ↓
One /admin shell                ←── sidebar, widgets, buttons filtered by permissions
```

- **New capability** = code change (add a key to `lib/rbac/registry.ts`, sync to DB).  
- **New role** = admin UI only (no deploy). Example: “Night Shift Supervisor”.  
- **Anti-pattern:** do not build `app/admin/yard`, `app/admin/clerk`, or `if (role === 'MANAGER')`.

```mermaid
flowchart TD
  Login[Login] --> User[Load User]
  User --> Role[Load Role]
  Role --> Perms[Load Permission set]
  Perms --> Shell[Admin Shell /admin]
  Shell --> Sidebar[Sidebar filtered by permissions]
  Shell --> Widgets[Home widgets filtered by permissions]
  Shell --> Pages[Pages requirePermission]
  Shell --> Actions[Server actions requirePermission]
```



---



## C2. Rules (locked)


| Topic                         | Decision                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Who invents permission keys   | Developers only — Super Admin cannot invent keys                                                                     |
| Who creates roles             | Super Admin — combinations of existing keys                                                                          |
| User ↔ role                   | **One role per user** (`User.roleId`)                                                                                |
| Per-user permission overrides | **No**                                                                                                               |
| Dashboards                    | **One** shell at `/admin`                                                                                            |
| Branches                      | **Single site** (Doxa Nairobi). Sweet1ne multi-branch scope is out of scope — permission = *what*; no *where* table. |
| Super Admin                   | System role — cannot delete; cannot remove last active superadmin                                                    |
| Role delete                   | Blocked while users assigned — reassign first                                                                        |
| Security                      | `requirePermission(key)` on every page, action, API — nav hide is cosmetic only                                      |


---



## C3. Schema

```prisma
model Permission {
  id          String           @id @default(cuid())
  key         String           @unique   // e.g. "booking:dispatch"
  label       String
  category    String                      // Clients, Bookings, Finance, …
  description String?
  roleLinks   RolePermission[]
  @@map("permissions")
}

model Role {
  id          String           @id @default(cuid())
  name        String           @unique
  description String?
  isSystem    Boolean          @default(false)  // Super Admin
  permissions RolePermission[]
  users       User[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  @@map("roles")
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model RbacMeta {
  id      Int @id @default(1)
  version Int @default(1)
  @@map("rbac_meta")
}

// User: drop enum Role + dashboardAccess; add:
// roleId String?
// role   Role? @relation(...)
// status UserStatus (ACTIVE | INACTIVE | SUSPENDED)
// isSuperAdmin Boolean
```

---



## C4. Permission registry

```ts
// lib/rbac/registry.ts — ONLY place new KEYS are added
export const PERMISSIONS = {
  CLIENT_VIEW: 'client:view',
  CLIENT_CREATE: 'client:create',
  CLIENT_EDIT: 'client:edit',
  CLIENT_SUSPEND: 'client:suspend',
  CLIENT_LOOKUP: 'client:lookup',
  CLIENT_UPLOAD: 'client:upload',
  VEHICLE_VIEW: 'vehicle:view',
  VEHICLE_CREATE: 'vehicle:create',
  VEHICLE_EDIT: 'vehicle:edit',
  VEHICLE_ASSIGN_OWNER: 'vehicle:assign_owner',
  OWNER_VIEW: 'owner:view',
  OWNER_CREATE: 'owner:create',
  OWNER_EDIT: 'owner:edit',
  OWNER_UPLOAD: 'owner:upload',
  OWNER_PAYOUT: 'owner:payout',
  OWNER_STATEMENT: 'owner:statement',
  BOOKING_VIEW: 'booking:view',
  BOOKING_CREATE: 'booking:create',
  BOOKING_DISPATCH: 'booking:dispatch',
  BOOKING_EXTEND: 'booking:extend',
  BOOKING_CHECKIN: 'booking:checkin',
  BOOKING_CONDITION: 'booking:condition',
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_RECORD: 'payment:record',
  PAYMENT_STK: 'payment:stk',
  EXPENSE_RECORD: 'expense:record',
  REPORT_EXPORT: 'report:export',
  SETTINGS_PENALTY_EDIT: 'settings:penalty_rules:edit',
  SETTINGS_COMMISSION: 'settings:commission:edit',
  MESSAGE_VIEW: 'message:view',
  MESSAGE_SEND: 'message:send',
  MESSAGE_BROADCAST: 'message:broadcast',
  STAFF_VIEW: 'staff:view',
  STAFF_MANAGE: 'staff:manage',
  STAFF_ROLE_ASSIGN: 'staff:role:assign',
  STAFF_ROLE_EDIT: 'staff:role:edit',
  DASHBOARD_VIEW: 'dashboard:view',
} as const
```

Sync on deploy: upsert registry keys; **report** orphaned `RolePermission` rows (do not silently delete).

---



## C5. Resolution & enforcement



### JWT (lightweight)

```ts
type AppMetadataPayload = {
  status: UserStatus
  isSuperAdmin: boolean
  dbUserId: string
  fullName: string
  roleId: string | null
  rbacVersion: number
  // deliberately NOT: permissions[]
}
```


| Change                     | Mechanism                                       |
| -------------------------- | ----------------------------------------------- |
| User’s role changed        | Re-sync that user’s `app_metadata`              |
| Role’s permissions changed | Bump `RbacMeta.version` — all caches invalidate |


Cache key: `roleId + ':' + rbacVersion`

### Server gate

```ts
export async function requirePermission(key: PermissionKey) {
  const session = await requireSessionProfile()
  if (session.status !== 'ACTIVE') throw new ForbiddenError()
  if (session.isSuperAdmin) {
    await writeAudit({ userId: session.id, action: 'superadmin.bypass', meta: { key } })
    return session
  }
  const allowed = await getUserPermissions(session)
  if (!allowed.has(key)) throw new ForbiddenError()
  return session
}
```

Client `hasPermission` only hides UI — never trust it alone.

```mermaid
flowchart TD
  Request[Server action or route] --> Require["requirePermission(key)"]
  Require --> JWT["Read roleId + rbacVersion"]
  JWT --> Super{isSuperAdmin?}
  Super -->|yes| Audit[AuditLog] --> Run
  Super -->|no| Cache{Cache hit?}
  Cache -->|yes| Set[Permission set]
  Cache -->|no| DB[(RolePermission)]
  DB --> Set
  Set --> Check{Has key?}
  Check -->|no| Forbid[403]
  Check -->|yes| Run[Business logic]
```



---



## C6. Admin UX



### Role editor

Checkbox grid by category. Save → rewrite `RolePermission` → bump `rbacVersion` → audit. Super Admin role not editable/deletable.

### Staff editor

List users → assign **one** role by email → `staff:role:assign` → audit → sync metadata.

### Guardrails


| Rule                                               | Why                  |
| -------------------------------------------------- | -------------------- |
| Cannot strip own last `staff:role:assign`          | Self-lockout         |
| Cannot delete Super Admin / last active superadmin | Recovery             |
| Cannot delete role with users assigned             | Force reassign first |
| Deactivate = status change, not role wipe          | Audit history        |


---



## C7. Seeded roles


| Role                               | Seeded?                                                   |
| ---------------------------------- | --------------------------------------------------------- |
| **Super Admin** (system)           | **Yes** — only staff account at seed; all permission keys |
| Clerk / Yard / Accountant / custom | **No** — Super Admin creates roles in `/admin/settings`      |


Same Sweet1ne rule: unlimited admin-created roles; no code deploy to add a role name.

---



## C8. One shell (LEGO)

```
DashboardShell
├── Sidebar   ← filter by permission
├── Header
├── Widgets   ← each widget has a permission
└── Main      ← pages + buttons each requirePermission
```

`lib/rbac/nav.ts` maps href → required permission. Layout resolves permissions once and passes them down. Everyone lands on `/admin` — content differs by permission set, not by folder.

Same page, different buttons: Yard Staff sees View; Director sees Edit/Delete — one page, permission checks on each action.

---



## C9. Package split


| Module                 | Knowledge                          |
| ---------------------- | ---------------------------------- |
| `lib/rbac/engine.ts`   | Resolve permissions for a `roleId` |
| `lib/rbac/cache.ts`    | Versioned cache                    |
| `lib/rbac/require.ts`  | `requirePermission`                |
| `lib/rbac/nav.ts`      | Filter nav/widgets                 |
| `lib/rbac/registry.ts` | **Car-hire keys only**             |


---



## C10. CI guard

Enumerate every `'use server'` export and route handler; assert `requirePermission` (allowlist: login, auth callback, M-Pesa callback, health).

---



## C11. Test criteria

- [ ] Registry sync upserts keys; orphans reported  
- [ ] Assign user → one role → correct permission set  
- [ ] Role permission edit bumps version; other sessions see change without re-login  
- [ ] Yard Staff cannot call Director-only penalty edit  
- [ ] Role with assignees cannot be deleted  
- [ ] Super Admin not deletable; ≥1 active superadmin  
- [ ] Deactivated user denied  
- [ ] Nav/widgets match permissions; direct URL without permission → 403  
- [ ] Unguarded-action CI test fails when guard missing  

---



## Related docs


| Doc                                              | Role                                                   |
| ------------------------------------------------ | ------------------------------------------------------ |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Feature inventory (plain English + technical) + stages |
| [DATA_MODEL.md](DATA_MODEL.md)                   | Tables / ERD / seed accounts                           |
| [DESIGN.md](DESIGN.md)                           | UI tokens                                              |
| [README](../README.md)                           | Product overview                                       |
| `.env.local.example`                             | Env placeholders                                       |
| `prisma/schema.prisma`                           | Data model source of truth                             |


Prepared for **Doxa Motor Solutions** · SpectreTech Limited · SP-DOXA-2026-001