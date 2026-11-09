-- Purchases schema: purchase orders and goods receipts
CREATE SCHEMA "purchases";

-- PurchaseOrders: purchase orders to suppliers.
CREATE TABLE "purchases"."PurchaseOrders" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL REFERENCES "core"."Stores"("Id") ON DELETE RESTRICT,
    "SupplierId" uuid NOT NULL REFERENCES "suppliers"."Suppliers"("Id") ON DELETE RESTRICT,
    "OrderNumber" text NOT NULL,
    "Status" text NOT NULL DEFAULT 'draft',
    "OrderDate" timestamp with time zone DEFAULT now() NOT NULL,
    "ExpectedDate" timestamp with time zone,
    "Subtotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "TaxTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "GrandTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "Notes" text,
    "CreatedByUserId" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PurchaseOrders_OrderNumber_key" UNIQUE ("OrderNumber"),
    CONSTRAINT "PurchaseOrders_Status_check" CHECK ("Status" IN ('draft', 'ordered', 'partial', 'received', 'cancelled')),
    CONSTRAINT "PurchaseOrders_Subtotal_check" CHECK ("Subtotal" >= 0),
    CONSTRAINT "PurchaseOrders_TaxTotal_check" CHECK ("TaxTotal" >= 0),
    CONSTRAINT "PurchaseOrders_GrandTotal_check" CHECK ("GrandTotal" >= 0)
);
CREATE INDEX "PurchaseOrders_BusinessId_idx" ON "purchases"."PurchaseOrders" ("BusinessId");
CREATE INDEX "PurchaseOrders_StoreId_idx" ON "purchases"."PurchaseOrders" ("StoreId");
CREATE INDEX "PurchaseOrders_SupplierId_idx" ON "purchases"."PurchaseOrders" ("SupplierId");
CREATE INDEX "PurchaseOrders_Status_idx" ON "purchases"."PurchaseOrders" ("Status");
CREATE INDEX "PurchaseOrders_OrderDate_idx" ON "purchases"."PurchaseOrders" ("OrderDate");

-- Enable RLS on PurchaseOrders
ALTER TABLE "purchases"."PurchaseOrders" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read purchase orders of businesses they are active members of
CREATE POLICY "purchase_orders_select_member" ON "purchases"."PurchaseOrders"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers can insert purchase orders
CREATE POLICY "purchase_orders_insert_manager" ON "purchases"."PurchaseOrders"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can update purchase orders
CREATE POLICY "purchase_orders_update_manager" ON "purchases"."PurchaseOrders"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- PurchaseOrderItems: line items for a purchase order.
CREATE TABLE "purchases"."PurchaseOrderItems" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "PurchaseOrderId" uuid NOT NULL REFERENCES "purchases"."PurchaseOrders"("Id") ON DELETE CASCADE,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE RESTRICT,
    "ProductName" text NOT NULL,
    "Sku" text,
    "QuantityOrdered" integer NOT NULL,
    "QuantityReceived" integer NOT NULL DEFAULT 0,
    "UnitCost" numeric(14, 2) NOT NULL DEFAULT '0',
    "LineTotal" numeric(14, 2) NOT NULL DEFAULT '0',
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PurchaseOrderItems_QuantityOrdered_check" CHECK ("QuantityOrdered" > 0),
    CONSTRAINT "PurchaseOrderItems_QuantityReceived_check" CHECK ("QuantityReceived" >= 0),
    CONSTRAINT "PurchaseOrderItems_UnitCost_check" CHECK ("UnitCost" >= 0),
    CONSTRAINT "PurchaseOrderItems_LineTotal_check" CHECK ("LineTotal" >= 0)
);
CREATE INDEX "PurchaseOrderItems_PurchaseOrderId_idx" ON "purchases"."PurchaseOrderItems" ("PurchaseOrderId");
CREATE INDEX "PurchaseOrderItems_ProductId_idx" ON "purchases"."PurchaseOrderItems" ("ProductId");

-- Enable RLS on PurchaseOrderItems
ALTER TABLE "purchases"."PurchaseOrderItems" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read purchase order items of businesses they are active members of
CREATE POLICY "purchase_order_items_select_member" ON "purchases"."PurchaseOrderItems"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "purchases"."PurchaseOrders" po
      WHERE po."Id" = "PurchaseOrderItems"."PurchaseOrderId"
        AND "core"."is_business_member"(po."BusinessId")
    ));

-- Policy: business owners/admins/managers can insert purchase order items
CREATE POLICY "purchase_order_items_insert_manager" ON "purchases"."PurchaseOrderItems"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "purchases"."PurchaseOrders" po
      WHERE po."Id" = "PurchaseOrderItems"."PurchaseOrderId"
        AND ("core"."has_business_role"(po."BusinessId", 'owner') OR "core"."has_business_role"(po."BusinessId", 'admin') OR "core"."has_business_role"(po."BusinessId", 'manager'))
    ));

-- Policy: business owners/admins/managers can update purchase order items
CREATE POLICY "purchase_order_items_update_manager" ON "purchases"."PurchaseOrderItems"
    FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "purchases"."PurchaseOrders" po
      WHERE po."Id" = "PurchaseOrderItems"."PurchaseOrderId"
        AND ("core"."has_business_role"(po."BusinessId", 'owner') OR "core"."has_business_role"(po."BusinessId", 'admin') OR "core"."has_business_role"(po."BusinessId", 'manager'))
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM "purchases"."PurchaseOrders" po
      WHERE po."Id" = "PurchaseOrderItems"."PurchaseOrderId"
        AND ("core"."has_business_role"(po."BusinessId", 'owner') OR "core"."has_business_role"(po."BusinessId", 'admin') OR "core"."has_business_role"(po."BusinessId", 'manager'))
    ));

-- GoodsReceipts: receipts against a purchase order.
CREATE TABLE "purchases"."GoodsReceipts" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "PurchaseOrderId" uuid NOT NULL REFERENCES "purchases"."PurchaseOrders"("Id") ON DELETE RESTRICT,
    "ReceiptNumber" text NOT NULL,
    "ReceivedByUserId" text,
    "ReceivedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "Notes" text,
    "Status" text NOT NULL DEFAULT 'received',
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "GoodsReceipts_ReceiptNumber_key" UNIQUE ("ReceiptNumber"),
    CONSTRAINT "GoodsReceipts_Status_check" CHECK ("Status" IN ('draft', 'received', 'voided'))
);
CREATE INDEX "GoodsReceipts_PurchaseOrderId_idx" ON "purchases"."GoodsReceipts" ("PurchaseOrderId");
CREATE INDEX "GoodsReceipts_ReceivedAt_idx" ON "purchases"."GoodsReceipts" ("ReceivedAt");

-- Enable RLS on GoodsReceipts
ALTER TABLE "purchases"."GoodsReceipts" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read goods receipts of businesses they are active members of
CREATE POLICY "goods_receipts_select_member" ON "purchases"."GoodsReceipts"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "purchases"."PurchaseOrders" po
      WHERE po."Id" = "GoodsReceipts"."PurchaseOrderId"
        AND "core"."is_business_member"(po."BusinessId")
    ));

-- Policy: business owners/admins/managers can insert goods receipts
CREATE POLICY "goods_receipts_insert_manager" ON "purchases"."GoodsReceipts"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "purchases"."PurchaseOrders" po
      WHERE po."Id" = "GoodsReceipts"."PurchaseOrderId"
        AND ("core"."has_business_role"(po."BusinessId", 'owner') OR "core"."has_business_role"(po."BusinessId", 'admin') OR "core"."has_business_role"(po."BusinessId", 'manager'))
    ));

-- Policy: business owners/admins/managers can update goods receipts
CREATE POLICY "goods_receipts_update_manager" ON "purchases"."GoodsReceipts"
    FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "purchases"."PurchaseOrders" po
      WHERE po."Id" = "GoodsReceipts"."PurchaseOrderId"
        AND ("core"."has_business_role"(po."BusinessId", 'owner') OR "core"."has_business_role"(po."BusinessId", 'admin') OR "core"."has_business_role"(po."BusinessId", 'manager'))
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM "purchases"."PurchaseOrders" po
      WHERE po."Id" = "GoodsReceipts"."PurchaseOrderId"
        AND ("core"."has_business_role"(po."BusinessId", 'owner') OR "core"."has_business_role"(po."BusinessId", 'admin') OR "core"."has_business_role"(po."BusinessId", 'manager'))
    ));

-- GoodsReceiptItems: received quantities linked to purchase order items.
CREATE TABLE "purchases"."GoodsReceiptItems" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "GoodsReceiptId" uuid NOT NULL REFERENCES "purchases"."GoodsReceipts"("Id") ON DELETE CASCADE,
    "PurchaseOrderItemId" uuid NOT NULL REFERENCES "purchases"."PurchaseOrderItems"("Id") ON DELETE RESTRICT,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE RESTRICT,
    "QuantityReceived" integer NOT NULL,
    "UnitCost" numeric(14, 2) NOT NULL DEFAULT '0',
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "GoodsReceiptItems_QuantityReceived_check" CHECK ("QuantityReceived" > 0),
    CONSTRAINT "GoodsReceiptItems_UnitCost_check" CHECK ("UnitCost" >= 0)
);
CREATE INDEX "GoodsReceiptItems_GoodsReceiptId_idx" ON "purchases"."GoodsReceiptItems" ("GoodsReceiptId");
CREATE INDEX "GoodsReceiptItems_PurchaseOrderItemId_idx" ON "purchases"."GoodsReceiptItems" ("PurchaseOrderItemId");
CREATE INDEX "GoodsReceiptItems_ProductId_idx" ON "purchases"."GoodsReceiptItems" ("ProductId");

-- Enable RLS on GoodsReceiptItems
ALTER TABLE "purchases"."GoodsReceiptItems" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read goods receipt items of businesses they are active members of
CREATE POLICY "goods_receipt_items_select_member" ON "purchases"."GoodsReceiptItems"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "purchases"."GoodsReceipts" gr
      JOIN "purchases"."PurchaseOrders" po ON po."Id" = gr."PurchaseOrderId"
      WHERE gr."Id" = "GoodsReceiptItems"."GoodsReceiptId"
        AND "core"."is_business_member"(po."BusinessId")
    ));

-- Policy: business owners/admins/managers can insert goods receipt items
CREATE POLICY "goods_receipt_items_insert_manager" ON "purchases"."GoodsReceiptItems"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "purchases"."GoodsReceipts" gr
      JOIN "purchases"."PurchaseOrders" po ON po."Id" = gr."PurchaseOrderId"
      WHERE gr."Id" = "GoodsReceiptItems"."GoodsReceiptId"
        AND ("core"."has_business_role"(po."BusinessId", 'owner') OR "core"."has_business_role"(po."BusinessId", 'admin') OR "core"."has_business_role"(po."BusinessId", 'manager'))
    ));
