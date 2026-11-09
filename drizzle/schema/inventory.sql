-- Inventory schema: stock per store, movement ledger, adjustments, reservations
CREATE SCHEMA "inventory";

-- Inventory: stock per product per store. Source of truth for multi-outlet stock.
CREATE TABLE "inventory"."Inventory" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES "core"."Stores"("Id") ON DELETE CASCADE,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE RESTRICT,
    "StockQuantity" integer NOT NULL DEFAULT 0,
    "ReservedQuantity" integer NOT NULL DEFAULT 0,
    "MinimumStock" integer NOT NULL DEFAULT 0,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Inventory_ProductId_StoreId_key" UNIQUE ("ProductId", "StoreId"),
    CONSTRAINT "Inventory_StockQuantity_check" CHECK ("StockQuantity" >= 0),
    CONSTRAINT "Inventory_ReservedQuantity_check" CHECK ("ReservedQuantity" >= 0),
    CONSTRAINT "Inventory_MinimumStock_check" CHECK ("MinimumStock" >= 0)
);
CREATE INDEX "Inventory_BusinessId_idx" ON "inventory"."Inventory" ("BusinessId");
CREATE INDEX "Inventory_StoreId_idx" ON "inventory"."Inventory" ("StoreId");
CREATE INDEX "Inventory_ProductId_idx" ON "inventory"."Inventory" ("ProductId");

-- Enable RLS on Inventory
ALTER TABLE "inventory"."Inventory" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read inventory of businesses they are active members of
CREATE POLICY "inventory_select_member" ON "inventory"."Inventory"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers/cashiers can insert inventory records
CREATE POLICY "inventory_insert_staff" ON "inventory"."Inventory"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'));

-- Policy: business owners/admins/managers/cashiers can update inventory
CREATE POLICY "inventory_update_staff" ON "inventory"."Inventory"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'));

-- StockMovements: ledger of every stock change; never deleted when a product is archived.
CREATE TABLE "inventory"."StockMovements" (
    "Id" text PRIMARY KEY NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES "core"."Stores"("Id") ON DELETE CASCADE,
    "ProductId" text REFERENCES "products"."Products"("Id") ON DELETE SET NULL,
    "ProductName" text NOT NULL,
    "MovementType" text NOT NULL,
    "Quantity" integer NOT NULL,
    "StockAfter" integer NOT NULL,
    "UnitCost" numeric(14, 2),
    "Note" text,
    "StaffId" text REFERENCES "staff"."Staff"("Id") ON DELETE SET NULL,
    "StaffName" text,
    "ReferenceType" text,
    "ReferenceId" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "StockMovements_StockAfter_check" CHECK ("StockAfter" >= 0),
    CONSTRAINT "StockMovements_MovementType_check" CHECK ("MovementType" IN ('in', 'out', 'adjustment', 'sale', 'void', 'return', 'purchase', 'transfer'))
);
CREATE INDEX "StockMovements_BusinessId_idx" ON "inventory"."StockMovements" ("BusinessId");
CREATE INDEX "StockMovements_StoreId_idx" ON "inventory"."StockMovements" ("StoreId");
CREATE INDEX "StockMovements_ProductId_idx" ON "inventory"."StockMovements" ("ProductId");
CREATE INDEX "StockMovements_CreatedAt_idx" ON "inventory"."StockMovements" ("CreatedAt");
CREATE INDEX "StockMovements_ReferenceId_idx" ON "inventory"."StockMovements" ("ReferenceId");

-- Enable RLS on StockMovements
ALTER TABLE "inventory"."StockMovements" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read stock movements of businesses they are active members of
CREATE POLICY "stock_movements_select_member" ON "inventory"."StockMovements"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers/cashiers can insert stock movements
CREATE POLICY "stock_movements_insert_staff" ON "inventory"."StockMovements"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'));

-- StockAdjustments: manual adjustments with a reason.
CREATE TABLE "inventory"."StockAdjustments" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES "core"."Stores"("Id") ON DELETE CASCADE,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE RESTRICT,
    "AdjustmentType" text NOT NULL,
    "Quantity" integer NOT NULL,
    "Reason" text NOT NULL,
    "Notes" text,
    "AdjustedByUserId" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "StockAdjustments_Quantity_check" CHECK ("Quantity" >= 0),
    CONSTRAINT "StockAdjustments_AdjustmentType_check" CHECK ("AdjustmentType" IN ('increase', 'decrease', 'set'))
);
CREATE INDEX "StockAdjustments_BusinessId_idx" ON "inventory"."StockAdjustments" ("BusinessId");
CREATE INDEX "StockAdjustments_StoreId_idx" ON "inventory"."StockAdjustments" ("StoreId");
CREATE INDEX "StockAdjustments_ProductId_idx" ON "inventory"."StockAdjustments" ("ProductId");
CREATE INDEX "StockAdjustments_CreatedAt_idx" ON "inventory"."StockAdjustments" ("CreatedAt");

-- Enable RLS on StockAdjustments
ALTER TABLE "inventory"."StockAdjustments" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read stock adjustments of businesses they are active members of
CREATE POLICY "stock_adjustments_select_member" ON "inventory"."StockAdjustments"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers can insert stock adjustments
CREATE POLICY "stock_adjustments_insert_manager" ON "inventory"."StockAdjustments"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can update stock adjustments
CREATE POLICY "stock_adjustments_update_manager" ON "inventory"."StockAdjustments"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Reservations: stock held for orders until released or converted.
CREATE TABLE "inventory"."Reservations" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES "core"."Stores"("Id") ON DELETE CASCADE,
    "OrderId" text NOT NULL REFERENCES "transactions"."Orders"("Id") ON DELETE CASCADE,
    "OrderItemId" text REFERENCES "transactions"."OrderItems"("Id") ON DELETE CASCADE,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE RESTRICT,
    "Quantity" integer NOT NULL,
    "Status" text NOT NULL DEFAULT 'RESERVED',
    "ExpiresAt" timestamp with time zone,
    "ReleasedAt" timestamp with time zone,
    "ConvertedAt" timestamp with time zone,
    "ReleaseReason" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Reservations_Quantity_check" CHECK ("Quantity" > 0),
    CONSTRAINT "Reservations_Status_check" CHECK ("Status" IN ('RESERVED', 'RELEASED', 'CONVERTED', 'EXPIRED'))
);
CREATE INDEX "Reservations_OrderId_idx" ON "inventory"."Reservations" ("OrderId");
CREATE INDEX "Reservations_ProductId_idx" ON "inventory"."Reservations" ("ProductId");
CREATE INDEX "Reservations_Status_idx" ON "inventory"."Reservations" ("Status");
CREATE INDEX "Reservations_ExpiresAt_idx" ON "inventory"."Reservations" ("ExpiresAt");

-- Enable RLS on Reservations
ALTER TABLE "inventory"."Reservations" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read reservations of businesses they are active members of
CREATE POLICY "reservations_select_member" ON "inventory"."Reservations"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers/cashiers can insert reservations
CREATE POLICY "reservations_insert_staff" ON "inventory"."Reservations"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'));

-- Policy: business owners/admins/managers/cashiers can update reservations
CREATE POLICY "reservations_update_staff" ON "inventory"."Reservations"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'));