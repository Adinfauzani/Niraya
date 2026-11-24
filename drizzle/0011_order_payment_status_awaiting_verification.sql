-- Allow orders.paymentStatus = 'AWAITING_VERIFICATION' so dashboard reflects
-- proof-submitted state after customer uploads transfer bukti.
-- NOTE: Orders lives in the "transactions" schema (see src/server/db/schema/orders.ts
-- and drizzle/schema/transactions.sql), not "core". Earlier revisions targeted
-- "core"."Orders" and therefore never updated the live constraint.
ALTER TABLE "transactions"."Orders" DROP CONSTRAINT IF EXISTS "Orders_PaymentStatus_check";
ALTER TABLE "transactions"."Orders"
  ADD CONSTRAINT "Orders_PaymentStatus_check"
  CHECK ("PaymentStatus" in ('UNPAID','PENDING','PAID','FAILED','EXPIRED','PARTIALLY_REFUNDED','REFUNDED','AWAITING_VERIFICATION'));