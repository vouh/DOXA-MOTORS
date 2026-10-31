# Security — suspicious delete scoring

Doxa tracks abusive **record deletes** (currently car expenses) and raises a per-staff **suspicious score**. When the score **increases**, Super Admins are emailed and a critical staff notification is created.

## Rules

| Pattern | Score delta | Notes |
|---------|-------------|--------|
| More than **5** deletes in a consecutive streak | **+15** (once per streak) | Streak resets after **30 minutes** idle, or when the staff creates/updates an expense (“calming” action) |
| **Bulk delete** of more than **10** records | **+25** | Every qualifying bulk op |

Consecutive count increases by the number of records deleted (single = 1, bulk = N).

## Data (User)

- `suspiciousScore` — cumulative risk
- `consecutiveDeletes` — current streak
- `lastDeleteAt`
- `consecutiveDeleteAlerted` — whether the +15 streak alert already fired for this streak

## Side effects when score rises

1. **Audit log** (`DELETE` / `DELETE_BULK`) with previous and new score  
2. **Staff notification** (`kind: security`, urgency critical) → Notifications inbox  
3. **Email** to:
   - `SECURITY_ALERT_EMAIL` (optional), else  
   - `RESEND_TEST_EMAIL` (when set, Resend also routes all mail here), and  
   - all active Super Admin emails (includes seed `superadmin@doxacarhire.com`)

Email body includes actor, entity, mode/count, and **previous score → new score**.

## Code

- Scoring (pure): [`lib/security/suspicious-deletes.ts`](../lib/security/suspicious-deletes.ts)  
- Persist + notify: [`lib/security/track-deletes.ts`](../lib/security/track-deletes.ts)  
- Wired on expense delete / bulk delete in [`app/actions/car-hire.ts`](../app/actions/car-hire.ts)  
- Staff **Risk** column: `/admin/settings`

## Ops

After schema changes: stop the Next.js process, then `npx prisma generate` (and `migrate deploy` as needed). A stale Prisma client can make `prisma.staffNotification` undefined and break `/admin/notifications`.
