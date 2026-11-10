-- Lookups schema: payment methods, tax rates, discounts
CREATE SCHEMA "lookups";

-- PaymentMethods: payment options available to POS (global, not tenant-scoped).
CREATE TABLE "lookups"."PaymentMethods" (
    "Code" text PRIMARY KEY NOT NULL,
    "Name" text NOT NULL,
    "IsActive" boolean NOT NULL DEFAULT true,
    "RequiresReference" boolean NOT NULL DEFAULT false,
    "SortOrder" integer NOT NULL DEFAULT 0,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "PaymentMethods_IsActive_idx" ON "lookups"."PaymentMethods" ("IsActive");
CREATE INDEX "PaymentMethods_SortOrder_idx" ON "lookups"."PaymentMethods" ("SortOrder");

-- TaxRates: tax rates scoped to a business.
CREATE TABLE "lookups"."TaxRates" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "Name" text NOT NULL,
    "Rate" numeric(5, 4) NOT NULL DEFAULT '0',
    "IsDefault" boolean NOT NULL DEFAULT false,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "TaxRates_BusinessId_Name_key" UNIQUE ("BusinessId", "Name"),
    CONSTRAINT "TaxRates_Rate_check" CHECK ("Rate" >= 0 AND "Rate" <= 1)
);
CREATE INDEX "TaxRates_BusinessId_idx" ON "lookups"."TaxRates" ("BusinessId");
CREATE INDEX "TaxRates_IsDefault_idx" ON "lookups"."TaxRates" ("IsDefault");


-- Discounts: discounts applicable to transactions.
CREATE TABLE "lookups"."Discounts" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "Name" text NOT NULL,
    "Code" text NOT NULL,
    "Type" text NOT NULL DEFAULT 'fixed',
    "Value" numeric(14, 2) NOT NULL DEFAULT '0',
    "IsActive" boolean NOT NULL DEFAULT true,
    "StartsAt" timestamp with time zone,
    "EndsAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Discounts_BusinessId_Code_key" UNIQUE ("BusinessId", "Code"),
    CONSTRAINT "Discounts_Type_check" CHECK ("Type" IN ('percentage', 'fixed')),
    CONSTRAINT "Discounts_Value_check" CHECK ("Value" >= 0),
    CONSTRAINT "Discounts_PercentageValue_check" CHECK ("Type" <> 'percentage' OR "Value" <= 100)
);
CREATE INDEX "Discounts_BusinessId_idx" ON "lookups"."Discounts" ("BusinessId");
CREATE INDEX "Discounts_IsActive_idx" ON "lookups"."Discounts" ("IsActive");


-- BusinessCategories: predefined business categories for onboarding (global, not tenant-scoped).
CREATE TABLE "lookups"."BusinessCategories" (
    "Code" text PRIMARY KEY NOT NULL,
    "Name" text NOT NULL,
    "Description" text,
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "BusinessCategories_Name_key" UNIQUE ("Name")
);
CREATE INDEX "BusinessCategories_IsActive_idx" ON "lookups"."BusinessCategories" ("IsActive");
CREATE INDEX "BusinessCategories_SortOrder_idx" ON "lookups"."BusinessCategories" ("SortOrder");

-- Seed default categories
INSERT INTO "lookups"."BusinessCategories" ("Code", "Name", "Description", "SortOrder", "IsActive") VALUES
('fnb', 'Makanan & Minuman', 'Restoran, kafe, warung makan, catering, dll', 1, true),
('retail', 'Retail & Toko', 'Minimarket, baju, aksesoris, elektronik, dll', 2, true),
('service', 'Jasa & Layanan', 'Salon, bengkel, laundry, konsultan, dll', 3, true),
('health', 'Kesehatan & Kecantikan', 'Klinik, apotek, spa, kecantikan, dll', 4, true),
('education', 'Pendidikan & Pelatihan', 'Kursus, les privat, sekolah, training, dll', 5, true),
('other', 'Lainnya', 'Bidang usaha lain di luar kategori di atas', 6, true);
