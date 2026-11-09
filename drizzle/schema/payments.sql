-- Payments schema: payments, transaction discounts, refunds, refund items
CREATE SCHEMA "payments";

-- Payments: payments for transactions; supports staged and unified-order payments.
CREATE TABLE "payments"."Payments" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "TransactionId" text REFERENCES "transactions"."Transactions"("Id") ON DELETE CASCADE,
    "OrderId" text REFERENCES "transactions"."Orders"("Id") ON DELETE SET NULL,
    "Channel" text,
    "Currency" text NOT NULL DEFAULT 'IDR',
    "PaymentMethod" text NOT NULL REFERENCES "lookups"."PaymentMethods"("Code") ON DELETE RESTRICT,
    "Amount" numeric(14, 2) NOT NULL,
    "ReferenceNumber" text,
    "Provider" text,
    "ProviderReference" text,
    "ProofUrl" text,
    "ProofSubmittedAt" timestamp with time zone,
    "VerifiedByUserId" text,
    "VerifiedAt" timestamp with time zone,
    "VerificationNote" text,
    "ExpiresAt" timestamp with time zone,
    "Metadata" jsonb,
    "Status" text NOT NULL DEFAULT 'completed',
    "PaidAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Payments_Amount_check" CHECK ("Amount" >= 0),
    CONSTRAINT "Payments_Status_check" CHECK ("Status" IN ('pending', 'completed', 'failed', 'refunded', 'expired', 'partially_refunded', 'UNPAID', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'WAITING_PROOF', 'PENDING_VERIFICATION', 'REJECTED'))
);
CREATE INDEX "Payments_TransactionId_idx" ON "payments"."Payments" ("TransactionId");
CREATE INDEX "Payments_OrderId_idx" ON "payments"."Payments" ("OrderId");
CREATE INDEX "Payments_PaymentMethod_idx" ON "payments"."Payments" ("PaymentMethod");
CREATE INDEX "Payments_PaidAt_idx" ON "payments"."Payments" ("PaidAt");

-- Enable RLS on Payments
ALTER TABLE "payments"."Payments" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read payments of businesses they are active members of
CREATE POLICY "payments_select_member" ON "payments"."Payments"
    FOR SELECT TO authenticated
    USING (
      ("TransactionId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Transactions" t
        WHERE t."Id" = "Payments"."TransactionId"
          AND "core"."is_business_member"(t."BusinessId")
      )) OR
      ("OrderId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Orders" o
        WHERE o."Id" = "Payments"."OrderId"
          AND "core"."is_business_member"(o."BusinessId")
      ))
    );

-- Policy: business owners/admins/managers/cashiers can insert payments
CREATE POLICY "payments_insert_staff" ON "payments"."Payments"
    FOR INSERT TO authenticated
    WITH CHECK (
      ("TransactionId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Transactions" t
        WHERE t."Id" = "Payments"."TransactionId"
          AND ("core"."has_business_role"(t."BusinessId", 'owner') OR "core"."has_business_role"(t."BusinessId", 'admin') OR "core"."has_business_role"(t."BusinessId", 'manager') OR "core"."has_business_role"(t."BusinessId", 'cashier'))
      )) OR
      ("OrderId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Orders" o
        WHERE o."Id" = "Payments"."OrderId"
          AND ("core"."has_business_role"(o."BusinessId", 'owner') OR "core"."has_business_role"(o."BusinessId", 'admin') OR "core"."has_business_role"(o."BusinessId", 'manager') OR "core"."has_business_role"(o."BusinessId", 'cashier'))
      ))
    );

-- Policy: business owners/admins/managers can update payments (verification, refunds)
CREATE POLICY "payments_update_manager" ON "payments"."Payments"
    FOR UPDATE TO authenticated
    USING (
      ("TransactionId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Transactions" t
        WHERE t."Id" = "Payments"."TransactionId"
          AND ("core"."has_business_role"(t."BusinessId", 'owner') OR "core"."has_business_role"(t."BusinessId", 'admin') OR "core"."has_business_role"(t."BusinessId", 'manager'))
      )) OR
      ("OrderId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Orders" o
        WHERE o."Id" = "Payments"."OrderId"
          AND ("core"."has_business_role"(o."BusinessId", 'owner') OR "core"."has_business_role"(o."BusinessId", 'admin') OR "core"."has_business_role"(o."BusinessId", 'manager'))
      ))
    )
    WITH CHECK (
      ("TransactionId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Transactions" t
        WHERE t."Id" = "Payments"."TransactionId"
          AND ("core"."has_business_role"(t."BusinessId", 'owner') OR "core"."has_business_role"(t."BusinessId", 'admin') OR "core"."has_business_role"(t."BusinessId", 'manager'))
      )) OR
      ("OrderId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Orders" o
        WHERE o."Id" = "Payments"."OrderId"
          AND ("core"."has_business_role"(o."BusinessId", 'owner') OR "core"."has_business_role"(o."BusinessId", 'admin') OR "core"."has_business_role"(o."BusinessId", 'manager'))
      ))
    );

-- TransactionDiscounts: discount detail for a transaction.
CREATE TABLE "payments"."TransactionDiscounts" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "TransactionId" text NOT NULL REFERENCES "transactions"."Transactions"("Id") ON DELETE CASCADE,
    "DiscountId" uuid REFERENCES "lookups"."Discounts"("Id") ON DELETE SET NULL,
    "Name" text NOT NULL,
    "Type" text NOT NULL DEFAULT 'fixed',
    "Value" numeric(14, 2) NOT NULL DEFAULT '0',
    "Amount" numeric(14, 2) NOT NULL DEFAULT '0',
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "TransactionDiscounts_Type_check" CHECK ("Type" IN ('percentage', 'fixed')),
    CONSTRAINT "TransactionDiscounts_Value_check" CHECK ("Value" >= 0),
    CONSTRAINT "TransactionDiscounts_Amount_check" CHECK ("Amount" >= 0)
);
CREATE INDEX "TransactionDiscounts_TransactionId_idx" ON "payments"."TransactionDiscounts" ("TransactionId");
CREATE INDEX "TransactionDiscounts_DiscountId_idx" ON "payments"."TransactionDiscounts" ("DiscountId");

-- Enable RLS on TransactionDiscounts
ALTER TABLE "payments"."TransactionDiscounts" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read transaction discounts of businesses they are active members of
CREATE POLICY "transaction_discounts_select_member" ON "payments"."TransactionDiscounts"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "transactions"."Transactions" t
      WHERE t."Id" = "TransactionDiscounts"."TransactionId"
        AND "core"."is_business_member"(t."BusinessId")
    ));

-- Policy: business owners/admins/managers/cashiers can insert transaction discounts
CREATE POLICY "transaction_discounts_insert_staff" ON "payments"."TransactionDiscounts"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "transactions"."Transactions" t
      WHERE t."Id" = "TransactionDiscounts"."TransactionId"
        AND ("core"."has_business_role"(t."BusinessId", 'owner') OR "core"."has_business_role"(t."BusinessId", 'admin') OR "core"."has_business_role"(t."BusinessId", 'manager') OR "core"."has_business_role"(t."BusinessId", 'cashier'))
    ));

-- TransactionRefunds: refund headers; the original transaction is never deleted.
CREATE TABLE "payments"."TransactionRefunds" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "TransactionId" text NOT NULL REFERENCES "transactions"."Transactions"("Id") ON DELETE RESTRICT,
    "RefundNumber" text NOT NULL,
    "Amount" numeric(14, 2) NOT NULL,
    "Reason" text NOT NULL,
    "Status" text NOT NULL DEFAULT 'completed',
    "RefundedByUserId" text,
    "RefundedAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "TransactionRefunds_RefundNumber_key" UNIQUE ("RefundNumber"),
    CONSTRAINT "TransactionRefunds_Amount_check" CHECK ("Amount" >= 0),
    CONSTRAINT "TransactionRefunds_Status_check" CHECK ("Status" IN ('pending', 'completed', 'rejected'))
);
CREATE INDEX "TransactionRefunds_TransactionId_idx" ON "payments"."TransactionRefunds" ("TransactionId");
CREATE INDEX "TransactionRefunds_Status_idx" ON "payments"."TransactionRefunds" ("Status");

-- Enable RLS on TransactionRefunds
ALTER TABLE "payments"."TransactionRefunds" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read refunds of businesses they are active members of
CREATE POLICY "transaction_refunds_select_member" ON "payments"."TransactionRefunds"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "transactions"."Transactions" t
      WHERE t."Id" = "TransactionRefunds"."TransactionId"
        AND "core"."is_business_member"(t."BusinessId")
    ));

-- Policy: business owners/admins/managers can insert refunds
CREATE POLICY "transaction_refunds_insert_manager" ON "payments"."TransactionRefunds"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "transactions"."Transactions" t
      WHERE t."Id" = "TransactionRefunds"."TransactionId"
        AND ("core"."has_business_role"(t."BusinessId", 'owner') OR "core"."has_business_role"(t."BusinessId", 'admin') OR "core"."has_business_role"(t."BusinessId", 'manager'))
    ));

-- Policy: business owners/admins/managers can update refunds
CREATE POLICY "transaction_refunds_update_manager" ON "payments"."TransactionRefunds"
    FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "transactions"."Transactions" t
      WHERE t."Id" = "TransactionRefunds"."TransactionId"
        AND ("core"."has_business_role"(t."BusinessId", 'owner') OR "core"."has_business_role"(t."BusinessId", 'admin') OR "core"."has_business_role"(t."BusinessId", 'manager'))
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM "transactions"."Transactions" t
      WHERE t."Id" = "TransactionRefunds"."TransactionId"
        AND ("core"."has_business_role"(t."BusinessId", 'owner') OR "core"."has_business_role"(t."BusinessId", 'admin') OR "core"."has_business_role"(t."BusinessId", 'manager'))
    ));

-- TransactionRefundItems: refund lines referencing original transaction items.
CREATE TABLE "payments"."TransactionRefundItems" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "RefundId" uuid NOT NULL REFERENCES "payments"."TransactionRefunds"("Id") ON DELETE CASCADE,
    "TransactionItemId" text NOT NULL REFERENCES "transactions"."TransactionItems"("Id") ON DELETE RESTRICT,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE RESTRICT,
    "Quantity" integer NOT NULL,
    "UnitPrice" numeric(14, 2) NOT NULL,
    "LineTotal" numeric(14, 2) NOT NULL,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "TransactionRefundItems_Quantity_check" CHECK ("Quantity" > 0),
    CONSTRAINT "TransactionRefundItems_UnitPrice_check" CHECK ("UnitPrice" >= 0),
    CONSTRAINT "TransactionRefundItems_LineTotal_check" CHECK ("LineTotal" >= 0)
);
CREATE INDEX "TransactionRefundItems_RefundId_idx" ON "payments"."TransactionRefundItems" ("RefundId");
CREATE INDEX "TransactionRefundItems_TransactionItemId_idx" ON "payments"."TransactionRefundItems" ("TransactionItemId");
CREATE INDEX "TransactionRefundItems_ProductId_idx" ON "payments"."TransactionRefundItems" ("ProductId");

-- Enable RLS on TransactionRefundItems
ALTER TABLE "payments"."TransactionRefundItems" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read refund items of businesses they are active members of
CREATE POLICY "transaction_refund_items_select_member" ON "payments"."TransactionRefundItems"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "payments"."TransactionRefunds" tr
      JOIN "transactions"."Transactions" t ON t."Id" = tr."TransactionId"
      WHERE tr."Id" = "TransactionRefundItems"."RefundId"
        AND "core"."is_business_member"(t."BusinessId")
    ));

-- Policy: business owners/admins/managers can insert refund items
CREATE POLICY "transaction_refund_items_insert_manager" ON "payments"."TransactionRefundItems"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "payments"."TransactionRefunds" tr
      JOIN "transactions"."Transactions" t ON t."Id" = tr."TransactionId"
      WHERE tr."Id" = "TransactionRefundItems"."RefundId"
        AND ("core"."has_business_role"(t."BusinessId", 'owner') OR "core"."has_business_role"(t."BusinessId", 'admin') OR "core"."has_business_role"(t."BusinessId", 'manager'))
    ));
