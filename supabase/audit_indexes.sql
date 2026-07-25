-- Extra audit_logs indexes (run in Supabase SQL editor or via scripts)
-- Prisma manages createdAt + (entity, entityId); this covers M-Pesa STK lookups.

CREATE INDEX IF NOT EXISTS audit_logs_meta_checkout_request_id_idx
  ON audit_logs ((meta->>'checkoutRequestId'))
  WHERE action = 'MPESA_STK_INIT';
