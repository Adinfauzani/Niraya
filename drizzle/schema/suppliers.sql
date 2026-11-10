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
