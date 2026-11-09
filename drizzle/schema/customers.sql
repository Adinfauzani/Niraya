-- Customers schema: customers and their addresses
CREATE SCHEMA "customers";

-- Customers: customers scoped to a business.
CREATE TABLE "customers"."Customers" (
    "Id" text PRIMARY KEY NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "Name" text NOT NULL,
    "Phone" text NOT NULL,
    "Email" text,
    "Notes" text,
    "LoyaltyPoints" integer NOT NULL DEFAULT 0,
    "JoinedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "Customers_LoyaltyPoints_check" CHECK ("LoyaltyPoints" >= 0)
);
CREATE INDEX "Customers_BusinessId_idx" ON "customers"."Customers" ("BusinessId");
CREATE INDEX "Customers_Phone_idx" ON "customers"."Customers" ("Phone");
CREATE INDEX "Customers_Email_idx" ON "customers"."Customers" ("Email");
CREATE INDEX "Customers_Name_idx" ON "customers"."Customers" ("Name");

-- Enable RLS on Customers
ALTER TABLE "customers"."Customers" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read customers of businesses they are active members of
CREATE POLICY "customers_select_member" ON "customers"."Customers"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers/cashiers can insert customers
CREATE POLICY "customers_insert_staff" ON "customers"."Customers"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'));

-- Policy: business owners/admins/managers/cashiers can update customers
CREATE POLICY "customers_update_staff" ON "customers"."Customers"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager') OR "core"."has_business_role"("BusinessId", 'cashier'));

-- CustomerAddresses: a customer may have multiple addresses.
CREATE TABLE "customers"."CustomerAddresses" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "CustomerId" text NOT NULL REFERENCES "customers"."Customers"("Id") ON DELETE CASCADE,
    "Label" text NOT NULL DEFAULT 'Utama',
    "RecipientName" text,
    "Phone" text,
    "AddressLine1" text NOT NULL,
    "AddressLine2" text,
    "City" text,
    "Province" text,
    "PostalCode" text,
    "Country" text NOT NULL DEFAULT 'Indonesia',
    "IsPrimary" boolean NOT NULL DEFAULT false,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "CustomerAddresses_CustomerId_idx" ON "customers"."CustomerAddresses" ("CustomerId");
CREATE INDEX "CustomerAddresses_IsPrimary_idx" ON "customers"."CustomerAddresses" ("IsPrimary");

-- Enable RLS on CustomerAddresses
ALTER TABLE "customers"."CustomerAddresses" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read customer addresses of businesses they are active members of
CREATE POLICY "customer_addresses_select_member" ON "customers"."CustomerAddresses"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "customers"."Customers" c
      WHERE c."Id" = "CustomerAddresses"."CustomerId"
        AND "core"."is_business_member"(c."BusinessId")
    ));

-- Policy: business owners/admins/managers/cashiers can insert customer addresses
CREATE POLICY "customer_addresses_insert_staff" ON "customers"."CustomerAddresses"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "customers"."Customers" c
      WHERE c."Id" = "CustomerAddresses"."CustomerId"
        AND ("core"."has_business_role"(c."BusinessId", 'owner') OR "core"."has_business_role"(c."BusinessId", 'admin') OR "core"."has_business_role"(c."BusinessId", 'manager') OR "core"."has_business_role"(c."BusinessId", 'cashier'))
    ));

-- Policy: business owners/admins/managers/cashiers can update customer addresses
CREATE POLICY "customer_addresses_update_staff" ON "customers"."CustomerAddresses"
    FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "customers"."Customers" c
      WHERE c."Id" = "CustomerAddresses"."CustomerId"
        AND ("core"."has_business_role"(c."BusinessId", 'owner') OR "core"."has_business_role"(c."BusinessId", 'admin') OR "core"."has_business_role"(c."BusinessId", 'manager') OR "core"."has_business_role"(c."BusinessId", 'cashier'))
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM "customers"."Customers" c
      WHERE c."Id" = "CustomerAddresses"."CustomerId"
        AND ("core"."has_business_role"(c."BusinessId", 'owner') OR "core"."has_business_role"(c."BusinessId", 'admin') OR "core"."has_business_role"(c."BusinessId", 'manager') OR "core"."has_business_role"(c."BusinessId", 'cashier'))
    ));
