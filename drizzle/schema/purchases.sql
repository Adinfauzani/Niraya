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
