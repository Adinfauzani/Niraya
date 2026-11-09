-- Suppliers schema: suppliers
CREATE SCHEMA "suppliers";

-- Suppliers: goods suppliers scoped to a business.
CREATE TABLE "suppliers"."Suppliers" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "Name" text NOT NULL,
    "ContactName" text,
    "Phone" text,
    "Email" text,
    "Address" text,
    "TaxId" text,
    "Notes" text,
    "Status" text NOT NULL DEFAULT 'active',
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "Suppliers_Status_check" CHECK ("Status" IN ('active', 'inactive', 'archived'))
);
CREATE INDEX "Suppliers_BusinessId_idx" ON "suppliers"."Suppliers" ("BusinessId");
CREATE INDEX "Suppliers_Name_idx" ON "suppliers"."Suppliers" ("Name");
CREATE INDEX "Suppliers_Status_idx" ON "suppliers"."Suppliers" ("Status");

-- Enable RLS on Suppliers
ALTER TABLE "suppliers"."Suppliers" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read suppliers of businesses they are active members of
CREATE POLICY "suppliers_select_member" ON "suppliers"."Suppliers"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers can insert suppliers
CREATE POLICY "suppliers_insert_manager" ON "suppliers"."Suppliers"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can update suppliers
CREATE POLICY "suppliers_update_manager" ON "suppliers"."Suppliers"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));
