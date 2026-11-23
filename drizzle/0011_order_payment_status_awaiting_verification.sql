-- Allow orders.paymentStatus = 'AWAITING_VERIFICATION' so dashboard reflects
-- proof-submitted state after customer uploads transfer bukti.
ALTER TABLE "core"."Orders" DROP CONSTRAINT IF EXISTS "Orders_PaymentStatus_check";
ALTER TABLE "core"."Orders"
  ADD CONSTRAINT "Orders_PaymentStatus_check"
  CHECK ("PaymentStatus" in ('UNPAID','PENDING','PAID','FAILED','EXPIRED','PARTIALLY_REFUNDED','REFUNDED','AWAITING_VERIFICATION'));
