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
