-- Transactions schema: transactions, orders, line items, status history, idempotency, guest access
CREATE SCHEMA "transactions";

-- Transactions: sales transaction headers.
CREATE TABLE "transactions"."Transactions" (
    "Id" text PRIMARY KEY NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES "core"."Stores"("Id") ON DELETE RESTRICT,
    "TransactionNumber" text NOT NULL,
    "CashierId" text,
    "CashierName" text,
    "StaffId" text REFERENCES "staff"."Staff"("Id") ON DELETE SET NULL,
    "CustomerId" text REFERENCES "customers"."Customers"("Id") ON DELETE SET NULL,
    "CustomerName" text,
    "OrderType" text NOT NULL DEFAULT 'dine-in',
    "TableNumber" text,
    "PaymentMethod" text NOT NULL REFERENCES "lookups"."PaymentMethods"("Code") ON DELETE RESTRICT,
    "PaymentStatus" text NOT NULL DEFAULT 'paid',
    "TaxRateId" uuid REFERENCES "lookups"."TaxRates"("Id") ON DELETE SET NULL,
    "Subtotal" numeric(14, 2) NOT NULL,
    "DiscountTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "TaxTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "GrandTotal" numeric(14, 2) NOT NULL,
    "AmountPaid" numeric(14, 2),
    "ChangeAmount" numeric(14, 2),
    "Status" text NOT NULL DEFAULT 'completed',
    "VoidReason" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Transactions_TransactionNumber_key" UNIQUE ("TransactionNumber"),
    CONSTRAINT "Transactions_OrderType_check" CHECK ("OrderType" IN ('dine-in', 'takeaway', 'delivery')),
    CONSTRAINT "Transactions_Status_check" CHECK ("Status" IN ('completed', 'voided', 'refunded')),
    CONSTRAINT "Transactions_PaymentStatus_check" CHECK ("PaymentStatus" IN ('unpaid', 'partial', 'paid', 'refunded', 'voided')),
    CONSTRAINT "Transactions_Subtotal_check" CHECK ("Subtotal" >= 0),
    CONSTRAINT "Transactions_DiscountTotal_check" CHECK ("DiscountTotal" >= 0),
    CONSTRAINT "Transactions_TaxTotal_check" CHECK ("TaxTotal" >= 0),
    CONSTRAINT "Transactions_GrandTotal_check" CHECK ("GrandTotal" >= 0),
    CONSTRAINT "Transactions_AmountPaid_check" CHECK ("AmountPaid" IS NULL OR "AmountPaid" >= 0),
    CONSTRAINT "Transactions_ChangeAmount_check" CHECK ("ChangeAmount" IS NULL OR "ChangeAmount" >= 0)
);
CREATE INDEX "Transactions_BusinessId_idx" ON "transactions"."Transactions" ("BusinessId");
CREATE INDEX "Transactions_StoreId_idx" ON "transactions"."Transactions" ("StoreId");
CREATE INDEX "Transactions_CustomerId_idx" ON "transactions"."Transactions" ("CustomerId");
CREATE INDEX "Transactions_StaffId_idx" ON "transactions"."Transactions" ("StaffId");
CREATE INDEX "Transactions_CreatedAt_idx" ON "transactions"."Transactions" ("CreatedAt");
CREATE INDEX "Transactions_Status_idx" ON "transactions"."Transactions" ("Status");
CREATE INDEX "Transactions_PaymentMethod_idx" ON "transactions"."Transactions" ("PaymentMethod");

-- Enable RLS on Transactions
ALTER TABLE "transactions"."Transactions" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read transactions of businesses they are active members of
CREATE POLICY "transactions_select_member" ON "transactions"."Transactions"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers/cashiers can insert transactions
CREATE POLICY "transactions_insert_staff" ON "transactions"."Transactions"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'));

-- Policy: business owners/admins/managers can update transactions (cashiers can void)
CREATE POLICY "transactions_update_manager" ON "transactions"."Transactions"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- TransactionItems: line items; snapshots product name, SKU, and price.
CREATE TABLE "transactions"."TransactionItems" (
    "Id" text PRIMARY KEY NOT NULL,
    "TransactionId" text NOT NULL REFERENCES "transactions"."Transactions"("Id") ON DELETE CASCADE,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE RESTRICT,
    "ProductVariantId" uuid REFERENCES "products"."ProductVariants"("Id") ON DELETE SET NULL,
    "ProductName" text NOT NULL,
    "Sku" text,
    "Quantity" integer NOT NULL,
    "UnitPrice" numeric(14, 2) NOT NULL,
    "DiscountTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "TaxTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "LineTotal" numeric(14, 2) NOT NULL,
    "CostPrice" numeric(14, 2) NOT NULL DEFAULT '0',
    "Notes" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "TransactionItems_Quantity_check" CHECK ("Quantity" > 0),
    CONSTRAINT "TransactionItems_UnitPrice_check" CHECK ("UnitPrice" >= 0),
    CONSTRAINT "TransactionItems_DiscountTotal_check" CHECK ("DiscountTotal" >= 0),
    CONSTRAINT "TransactionItems_TaxTotal_check" CHECK ("TaxTotal" >= 0),
    CONSTRAINT "TransactionItems_LineTotal_check" CHECK ("LineTotal" >= 0),
    CONSTRAINT "TransactionItems_CostPrice_check" CHECK ("CostPrice" >= 0)
);
CREATE INDEX "TransactionItems_TransactionId_idx" ON "transactions"."TransactionItems" ("TransactionId");
CREATE INDEX "TransactionItems_ProductId_idx" ON "transactions"."TransactionItems" ("ProductId");
CREATE INDEX "TransactionItems_ProductVariantId_idx" ON "transactions"."TransactionItems" ("ProductVariantId");

-- Enable RLS on TransactionItems
ALTER TABLE "transactions"."TransactionItems" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read transaction items of businesses they are active members of (via transaction)
CREATE POLICY "transaction_items_select_member" ON "transactions"."TransactionItems"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "transactions"."Transactions" t
      WHERE t."Id" = "TransactionItems"."TransactionId"
        AND "core"."is_business_member"(t."BusinessId")
    ));

-- Policy: business owners/admins/managers/cashiers can insert transaction items
CREATE POLICY "transaction_items_insert_staff" ON "transactions"."TransactionItems"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "transactions"."Transactions" t
      WHERE t."Id" = "TransactionItems"."TransactionId"
        AND ("core"."has_business_role"(t."BusinessId", 'owner') OR "core"."has_business_role"(t."BusinessId", 'admin') OR "core"."has_business_role"(t."BusinessId", 'manager') OR "core"."has_business_role"(t."BusinessId", 'cashier'))
    ));

-- Orders: operational source of truth for POS and QR ordering.
CREATE TABLE "transactions"."Orders" (
    "Id" text PRIMARY KEY NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES "core"."Stores"("Id") ON DELETE RESTRICT,
    "OrderNumber" text NOT NULL,
    "OrderSource" text NOT NULL,
    "OrderStatus" text NOT NULL DEFAULT 'SUBMITTED',
    "PaymentStatus" text NOT NULL DEFAULT 'UNPAID',
    "DiningTableId" uuid REFERENCES "core"."DiningTables"("Id") ON DELETE SET NULL,
    "CustomerId" text REFERENCES "customers"."Customers"("Id") ON DELETE SET NULL,
    "CustomerName" text,
    "CustomerPhone" text,
    "CashierId" text,
    "CashierName" text,
    "OrderType" text NOT NULL DEFAULT 'dine-in',
    "TableNumber" text,
    "PaymentMethod" text,
    "Currency" text NOT NULL DEFAULT 'IDR',
    "Subtotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "DiscountTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "TaxTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "GrandTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "AmountPaid" numeric(14, 2),
    "ChangeAmount" numeric(14, 2),
    "IdempotencyKey" text,
    "LinkedTransactionId" text REFERENCES "transactions"."Transactions"("Id") ON DELETE SET NULL,
    "Notes" text,
    "CancelReason" text,
    "SubmittedAt" timestamp with time zone,
    "PaidAt" timestamp with time zone,
    "CompletedAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Orders_OrderNumber_key" UNIQUE ("OrderNumber"),
    CONSTRAINT "Orders_IdempotencyKey_key" UNIQUE ("IdempotencyKey"),
    CONSTRAINT "Orders_OrderSource_check" CHECK ("OrderSource" IN ('POS', 'QR_TABLE', 'QR_GENERAL')),
    CONSTRAINT "Orders_OrderStatus_check" CHECK ("OrderStatus" IN ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT "Orders_PaymentStatus_check" CHECK ("PaymentStatus" IN ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED'))
);
CREATE INDEX "Orders_BusinessId_idx" ON "transactions"."Orders" ("BusinessId");
CREATE INDEX "Orders_StoreId_idx" ON "transactions"."Orders" ("StoreId");
CREATE INDEX "Orders_Status_idx" ON "transactions"."Orders" ("OrderStatus");
CREATE INDEX "Orders_PaymentStatus_idx" ON "transactions"."Orders" ("PaymentStatus");
CREATE INDEX "Orders_Source_idx" ON "transactions"."Orders" ("OrderSource");
CREATE INDEX "Orders_CreatedAt_idx" ON "transactions"."Orders" ("CreatedAt");
CREATE INDEX "Orders_DiningTableId_idx" ON "transactions"."Orders" ("DiningTableId");

-- Enable RLS on Orders
ALTER TABLE "transactions"."Orders" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read orders of businesses they are active members of
CREATE POLICY "orders_select_member" ON "transactions"."Orders"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers/cashiers can insert orders
CREATE POLICY "orders_insert_staff" ON "transactions"."Orders"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'));

-- Policy: business owners/admins/managers/cashiers can update orders
CREATE POLICY "orders_update_staff" ON "transactions"."Orders"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'));

-- OrderItems: order line snapshots; history stays valid if the product changes.
CREATE TABLE "transactions"."OrderItems" (
    "Id" text PRIMARY KEY NOT NULL,
    "OrderId" text NOT NULL REFERENCES "transactions"."Orders"("Id") ON DELETE CASCADE,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE RESTRICT,
    "ProductVariantId" uuid REFERENCES "products"."ProductVariants"("Id") ON DELETE SET NULL,
    "ProductName" text NOT NULL,
    "Sku" text,
    "VariantName" text,
    "Quantity" integer NOT NULL,
    "UnitPrice" numeric(14, 2) NOT NULL,
    "DiscountTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "TaxTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "Subtotal" numeric(14, 2) NOT NULL,
    "Notes" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "OrderItems_Quantity_check" CHECK ("Quantity" > 0)
);
CREATE INDEX "OrderItems_OrderId_idx" ON "transactions"."OrderItems" ("OrderId");
CREATE INDEX "OrderItems_ProductId_idx" ON "transactions"."OrderItems" ("ProductId");

-- Enable RLS on OrderItems
ALTER TABLE "transactions"."OrderItems" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read order items of businesses they are active members of (via order)
CREATE POLICY "order_items_select_member" ON "transactions"."OrderItems"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "transactions"."Orders" o
      WHERE o."Id" = "OrderItems"."OrderId"
        AND "core"."is_business_member"(o."BusinessId")
    ));

-- Policy: business owners/admins/managers/cashiers can insert order items
CREATE POLICY "order_items_insert_staff" ON "transactions"."OrderItems"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "transactions"."Orders" o
      WHERE o."Id" = "OrderItems"."OrderId"
        AND ("core"."has_business_role"(o."BusinessId", 'owner') OR "core"."has_business_role"(o."BusinessId", 'admin') OR "core"."has_business_role"(o."BusinessId", 'manager') OR "core"."has_business_role"(o."BusinessId", 'cashier'))
    ));

-- OrderStatusHistory: audit trail of order/payment status changes.
CREATE TABLE "transactions"."OrderStatusHistory" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "OrderId" text NOT NULL REFERENCES "transactions"."Orders"("Id") ON DELETE CASCADE,
    "FromOrderStatus" text,
    "ToOrderStatus" text NOT NULL,
    "FromPaymentStatus" text,
    "ToPaymentStatus" text,
    "ChangedByUserId" text,
    "ChangedByRole" text,
    "Reason" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "OrderStatusHistory_OrderId_idx" ON "transactions"."OrderStatusHistory" ("OrderId");
CREATE INDEX "OrderStatusHistory_CreatedAt_idx" ON "transactions"."OrderStatusHistory" ("CreatedAt");

-- Enable RLS on OrderStatusHistory
ALTER TABLE "transactions"."OrderStatusHistory" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read order status history of businesses they are active members of
CREATE POLICY "order_status_history_select_member" ON "transactions"."OrderStatusHistory"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "transactions"."Orders" o
      WHERE o."Id" = "OrderStatusHistory"."OrderId"
        AND "core"."is_business_member"(o."BusinessId")
    ));

-- Policy: business owners/admins/managers/cashiers can insert order status history
CREATE POLICY "order_status_history_insert_staff" ON "transactions"."OrderStatusHistory"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "transactions"."Orders" o
      WHERE o."Id" = "OrderStatusHistory"."OrderId"
        AND ("core"."has_business_role"(o."BusinessId", 'owner') OR "core"."has_business_role"(o."BusinessId", 'admin') OR "core"."has_business_role"(o."BusinessId", 'manager') OR "core"."has_business_role"(o."BusinessId", 'cashier'))
    ));

-- CheckoutIdempotency: idempotency keys for POS checkout.
CREATE TABLE "transactions"."CheckoutIdempotency" (
    "Key" text PRIMARY KEY NOT NULL,
    "RequestHash" text NOT NULL,
    "TransactionId" text REFERENCES "transactions"."Transactions"("Id") ON DELETE SET NULL,
    "OrderId" text REFERENCES "transactions"."Orders"("Id") ON DELETE SET NULL,
    "Scope" text,
    "Response" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "ExpiresAt" timestamp with time zone
);
CREATE INDEX "CheckoutIdempotency_TransactionId_idx" ON "transactions"."CheckoutIdempotency" ("TransactionId");
CREATE INDEX "CheckoutIdempotency_OrderId_idx" ON "transactions"."CheckoutIdempotency" ("OrderId");
CREATE INDEX "CheckoutIdempotency_ExpiresAt_idx" ON "transactions"."CheckoutIdempotency" ("ExpiresAt");

-- Enable RLS on CheckoutIdempotency
ALTER TABLE "transactions"."CheckoutIdempotency" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read idempotency keys of businesses they are active members of
CREATE POLICY "checkout_idempotency_select_member" ON "transactions"."CheckoutIdempotency"
    FOR SELECT TO authenticated
    USING (
      ("TransactionId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Transactions" t
        WHERE t."Id" = "CheckoutIdempotency"."TransactionId"
          AND "core"."is_business_member"(t."BusinessId")
      )) OR
      ("OrderId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Orders" o
        WHERE o."Id" = "CheckoutIdempotency"."OrderId"
          AND "core"."is_business_member"(o."BusinessId")
      ))
    );

-- Policy: business owners/admins/managers/cashiers can insert idempotency keys
CREATE POLICY "checkout_idempotency_insert_staff" ON "transactions"."CheckoutIdempotency"
    FOR INSERT TO authenticated
    WITH CHECK (
      ("TransactionId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Transactions" t
        WHERE t."Id" = "CheckoutIdempotency"."TransactionId"
          AND ("core"."has_business_role"(t."BusinessId", 'owner') OR "core"."has_business_role"(t."BusinessId", 'admin') OR "core"."has_business_role"(t."BusinessId", 'manager') OR "core"."has_business_role"(t."BusinessId", 'cashier'))
      )) OR
      ("OrderId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "transactions"."Orders" o
        WHERE o."Id" = "CheckoutIdempotency"."OrderId"
          AND ("core"."has_business_role"(o."BusinessId", 'owner') OR "core"."has_business_role"(o."BusinessId", 'admin') OR "core"."has_business_role"(o."BusinessId", 'manager') OR "core"."has_business_role"(o."BusinessId", 'cashier'))
      ))
    );

-- GuestOrderAccess: hashed guest order access tokens scoped to one order.
CREATE TABLE "transactions"."GuestOrderAccess" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "OrderId" text NOT NULL REFERENCES "transactions"."Orders"("Id") ON DELETE CASCADE,
    "TokenHash" text NOT NULL,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "ExpiresAt" timestamp with time zone,
    "RevokedAt" timestamp with time zone,
    "LastUsedAt" timestamp with time zone,
    CONSTRAINT "GuestOrderAccess_TokenHash_key" UNIQUE ("TokenHash")
);
CREATE INDEX "GuestOrderAccess_OrderId_idx" ON "transactions"."GuestOrderAccess" ("OrderId");
CREATE INDEX "GuestOrderAccess_ExpiresAt_idx" ON "transactions"."GuestOrderAccess" ("ExpiresAt");

-- Enable RLS on GuestOrderAccess
ALTER TABLE "transactions"."GuestOrderAccess" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read guest access of businesses they are active members of
CREATE POLICY "guest_order_access_select_member" ON "transactions"."GuestOrderAccess"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "transactions"."Orders" o
      WHERE o."Id" = "GuestOrderAccess"."OrderId"
        AND "core"."is_business_member"(o."BusinessId")
    ));

-- Policy: business owners/admins/managers can insert guest access
CREATE POLICY "guest_order_access_insert_manager" ON "transactions"."GuestOrderAccess"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "transactions"."Orders" o
      WHERE o."Id" = "GuestOrderAccess"."OrderId"
        AND ("core"."has_business_role"(o."BusinessId", 'owner') OR "core"."has_business_role"(o."BusinessId", 'admin') OR "core"."has_business_role"(o."BusinessId", 'manager'))
    ));

-- Policy: business owners/admins/managers can update guest access
CREATE POLICY "guest_order_access_update_manager" ON "transactions"."GuestOrderAccess"
    FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "transactions"."Orders" o
      WHERE o."Id" = "GuestOrderAccess"."OrderId"
        AND ("core"."has_business_role"(o."BusinessId", 'owner') OR "core"."has_business_role"(o."BusinessId", 'admin') OR "core"."has_business_role"(o."BusinessId", 'manager'))
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM "transactions"."Orders" o
      WHERE o."Id" = "GuestOrderAccess"."OrderId"
        AND ("core"."has_business_role"(o."BusinessId", 'owner') OR "core"."has_business_role"(o."BusinessId", 'admin') OR "core"."has_business_role"(o."BusinessId", 'manager'))
    ));
