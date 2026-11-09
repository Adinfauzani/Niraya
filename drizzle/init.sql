-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core schema: roles, permissions, businesses, stores, user profiles, business members
CREATE SCHEMA "core";

-- Roles: application roles for RBAC
CREATE TABLE "core"."Roles" (
    "Code" text PRIMARY KEY NOT NULL,
    "Name" text NOT NULL,
    "Description" text,
    "Rank" integer NOT NULL DEFAULT 0,
    "IsSystem" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Roles_Name_key" UNIQUE ("Name"),
    CONSTRAINT "Roles_Rank_check" CHECK ("Rank" >= 0)
);
CREATE INDEX "Roles_Rank_idx" ON "core"."Roles" ("Rank");

-- Permissions: granular permissions for RBAC
CREATE TABLE "core"."Permissions" (
    "Code" text PRIMARY KEY NOT NULL,
    "Name" text NOT NULL,
    "Description" text,
    "Module" text NOT NULL,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Permissions_Name_key" UNIQUE ("Name")
);
CREATE INDEX "Permissions_Module_idx" ON "core"."Permissions" ("Module");

-- RolePermissions: many-to-many mapping of roles to permissions
CREATE TABLE "core"."RolePermissions" (
    "RoleCode" text NOT NULL REFERENCES "core"."Roles"("Code") ON DELETE CASCADE,
    "PermissionCode" text NOT NULL REFERENCES "core"."Permissions"("Code") ON DELETE CASCADE,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY ("RoleCode", "PermissionCode")
);
CREATE INDEX "RolePermissions_RoleCode_idx" ON "core"."RolePermissions" ("RoleCode");
CREATE INDEX "RolePermissions_PermissionCode_idx" ON "core"."RolePermissions" ("PermissionCode");

-- Businesses: business entities (single or multi-business)
CREATE TABLE "core"."Businesses" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "Name" text NOT NULL,
    "Slug" text NOT NULL,
    "LegalName" text,
    "TaxId" text,
    "Currency" text NOT NULL DEFAULT 'IDR',
    "Timezone" text NOT NULL DEFAULT 'Asia/Jakarta',
    "OwnerUserId" text,
    "Status" text NOT NULL DEFAULT 'active',
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "Businesses_Slug_key" UNIQUE ("Slug"),
    CONSTRAINT "Businesses_Status_check" CHECK ("Status" IN ('active', 'suspended', 'archived'))
);
CREATE INDEX "Businesses_Status_idx" ON "core"."Businesses" ("Status");

-- Stores: outlets/locations belonging to a business
CREATE TABLE "core"."Stores" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "Name" text NOT NULL,
    "Code" text NOT NULL,
    "Address" text,
    "Phone" text,
    "Email" text,
    "Timezone" text NOT NULL DEFAULT 'Asia/Jakarta',
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "Stores_BusinessId_Code_key" UNIQUE ("BusinessId", "Code")
);
CREATE INDEX "Stores_BusinessId_idx" ON "core"."Stores" ("BusinessId");
CREATE INDEX "Stores_IsActive_idx" ON "core"."Stores" ("IsActive");

-- UserProfiles: application profile linking to Supabase Auth user
-- Primary key matches auth.users(id) for direct FK relationship.
CREATE TABLE "core"."UserProfiles" (
    "Id" uuid PRIMARY KEY NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "Name" text,
    "Email" text,
    "Role" text NOT NULL DEFAULT 'user' REFERENCES "core"."Roles"("Code") ON DELETE RESTRICT,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone
);
CREATE INDEX "UserProfiles_Role_idx" ON "core"."UserProfiles" ("Role");
CREATE INDEX "UserProfiles_Email_idx" ON "core"."UserProfiles" ("Email");

-- Enable RLS on UserProfiles
ALTER TABLE "core"."UserProfiles" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read their own profile
CREATE POLICY "user_profiles_select_own" ON "core"."UserProfiles"
    FOR SELECT TO authenticated
    USING (auth.uid() = "Id");

-- Policy: authenticated users can insert their own profile
CREATE POLICY "user_profiles_insert_own" ON "core"."UserProfiles"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = "Id");

-- Policy: authenticated users can update their own profile
CREATE POLICY "user_profiles_update_own" ON "core"."UserProfiles"
    FOR UPDATE TO authenticated
    USING (auth.uid() = "Id")
    WITH CHECK (auth.uid() = "Id");

-- Grant minimum permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON "core"."UserProfiles" TO authenticated;

-- BusinessMembers: user membership in a business with role and optional store access
CREATE TABLE "core"."BusinessMembers" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "UserId" text NOT NULL,
    "Role" text NOT NULL DEFAULT 'user' REFERENCES "core"."Roles"("Code") ON DELETE RESTRICT,
    "StoreId" uuid REFERENCES "core"."Stores"("Id") ON DELETE SET NULL,
    "Status" text NOT NULL DEFAULT 'active',
    "InvitedAt" timestamp with time zone,
    "JoinedAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "BusinessMembers_BusinessId_UserId_key" UNIQUE ("BusinessId", "UserId"),
    CONSTRAINT "BusinessMembers_Status_check" CHECK ("Status" IN ('invited', 'active', 'suspended', 'removed'))
);
CREATE INDEX "BusinessMembers_BusinessId_idx" ON "core"."BusinessMembers" ("BusinessId");
CREATE INDEX "BusinessMembers_UserId_idx" ON "core"."BusinessMembers" ("UserId");
CREATE INDEX "BusinessMembers_StoreId_idx" ON "core"."BusinessMembers" ("StoreId");

-- DiningTables: QR table/location tokens. Raw token is never stored; only hash.
CREATE TABLE "core"."DiningTables" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES "core"."Stores"("Id") ON DELETE CASCADE,
    "TableNumber" text,
    "Name" text,
    "QrType" text NOT NULL DEFAULT 'TABLE',
    "QrTokenHash" text NOT NULL,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "DiningTables_QrTokenHash_key" UNIQUE ("QrTokenHash"),
    CONSTRAINT "DiningTables_StoreId_TableNumber_key" UNIQUE ("StoreId", "TableNumber"),
    CONSTRAINT "DiningTables_QrType_check" CHECK ("QrType" IN ('TABLE', 'GENERAL'))
);
CREATE INDEX "DiningTables_BusinessId_idx" ON "core"."DiningTables" ("BusinessId");
CREATE INDEX "DiningTables_StoreId_idx" ON "core"."DiningTables" ("StoreId");
CREATE INDEX "DiningTables_IsActive_idx" ON "core"."DiningTables" ("IsActive");
CREATE INDEX "DiningTables_QrType_idx" ON "core"."DiningTables" ("QrType");-- Lookups schema: payment methods, tax rates, discounts
CREATE SCHEMA "lookups";

-- PaymentMethods: payment options available to POS.
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

-- BusinessCategories: predefined business categories for onboarding.
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
-- Products schema: categories, products, variants, units, barcodes, prices
CREATE SCHEMA "products";

-- Categories: product categories with optional nesting.
CREATE TABLE "products"."Categories" (
    "Id" text PRIMARY KEY NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "ParentCategoryId" text REFERENCES "products"."Categories"("Id") ON DELETE SET NULL,
    "Name" text NOT NULL,
    "Description" text,
    "SortOrder" integer NOT NULL DEFAULT 0,
    "Status" text NOT NULL DEFAULT 'active',
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "Categories_Status_check" CHECK ("Status" IN ('active', 'archived'))
);
CREATE INDEX "Categories_BusinessId_idx" ON "products"."Categories" ("BusinessId");
CREATE INDEX "Categories_ParentCategoryId_idx" ON "products"."Categories" ("ParentCategoryId");
CREATE INDEX "Categories_Name_idx" ON "products"."Categories" ("Name");
CREATE INDEX "Categories_Status_idx" ON "products"."Categories" ("Status");

-- Products: catalog items; SKU is unique per business.
CREATE TABLE "products"."Products" (
    "Id" text PRIMARY KEY NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "CategoryId" text REFERENCES "products"."Categories"("Id") ON DELETE SET NULL,
    "Name" text NOT NULL,
    "Description" text,
    "Sku" text NOT NULL,
    "Barcode" text,
    "SellingPrice" numeric(14, 2) NOT NULL DEFAULT '0',
    "CostPrice" numeric(14, 2) NOT NULL DEFAULT '0',
    "StockQuantity" integer NOT NULL DEFAULT 0,
    "MinimumStock" integer NOT NULL DEFAULT 0,
    "Unit" text NOT NULL DEFAULT 'pcs',
    "ImageUrl" text,
    "IsTaxable" boolean NOT NULL DEFAULT true,
    "IsStockTracked" boolean NOT NULL DEFAULT true,
    "Status" text NOT NULL DEFAULT 'active',
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "ArchivedAt" timestamp with time zone,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "Products_BusinessId_Sku_key" UNIQUE ("BusinessId", "Sku"),
    CONSTRAINT "Products_Status_check" CHECK ("Status" IN ('active', 'archived', 'discontinued')),
    CONSTRAINT "Products_SellingPrice_check" CHECK ("SellingPrice" >= 0),
    CONSTRAINT "Products_CostPrice_check" CHECK ("CostPrice" >= 0),
    CONSTRAINT "Products_StockQuantity_check" CHECK ("StockQuantity" >= 0),
    CONSTRAINT "Products_MinimumStock_check" CHECK ("MinimumStock" >= 0)
);
CREATE INDEX "Products_BusinessId_idx" ON "products"."Products" ("BusinessId");
CREATE INDEX "Products_CategoryId_idx" ON "products"."Products" ("CategoryId");
CREATE INDEX "Products_Barcode_idx" ON "products"."Products" ("Barcode");
CREATE INDEX "Products_Name_idx" ON "products"."Products" ("Name");
CREATE INDEX "Products_Status_idx" ON "products"."Products" ("Status");

-- ProductVariants: variants such as size or flavor.
CREATE TABLE "products"."ProductVariants" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE CASCADE,
    "Name" text NOT NULL,
    "Sku" text NOT NULL,
    "Barcode" text,
    "SellingPrice" numeric(14, 2),
    "CostPrice" numeric(14, 2),
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "ProductVariants_BusinessId_Sku_key" UNIQUE ("BusinessId", "Sku")
);
CREATE INDEX "ProductVariants_ProductId_idx" ON "products"."ProductVariants" ("ProductId");
CREATE INDEX "ProductVariants_Barcode_idx" ON "products"."ProductVariants" ("Barcode");

-- ProductUnits: product units and their conversion factor.
CREATE TABLE "products"."ProductUnits" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE CASCADE,
    "Name" text NOT NULL,
    "Abbreviation" text NOT NULL,
    "ConversionFactor" numeric(12, 4) NOT NULL DEFAULT '1',
    "IsBase" boolean NOT NULL DEFAULT false,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "ProductUnits_ProductId_Name_key" UNIQUE ("ProductId", "Name"),
    CONSTRAINT "ProductUnits_ConversionFactor_check" CHECK ("ConversionFactor" > 0)
);
CREATE INDEX "ProductUnits_ProductId_idx" ON "products"."ProductUnits" ("ProductId");

-- ProductBarcodes: additional barcodes per product.
CREATE TABLE "products"."ProductBarcodes" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE CASCADE,
    "Barcode" text NOT NULL,
    "IsPrimary" boolean NOT NULL DEFAULT false,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "ProductBarcodes_Barcode_key" UNIQUE ("Barcode")
);
CREATE INDEX "ProductBarcodes_ProductId_idx" ON "products"."ProductBarcodes" ("ProductId");

-- ProductPrices: per-store / per-price-type overrides.
CREATE TABLE "products"."ProductPrices" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "ProductId" text NOT NULL REFERENCES "products"."Products"("Id") ON DELETE CASCADE,
    "StoreId" uuid REFERENCES "core"."Stores"("Id") ON DELETE SET NULL,
    "PriceType" text NOT NULL DEFAULT 'retail',
    "SellingPrice" numeric(14, 2) NOT NULL DEFAULT '0',
    "CostPrice" numeric(14, 2) NOT NULL DEFAULT '0',
    "StartsAt" timestamp with time zone,
    "EndsAt" timestamp with time zone,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "ProductPrices_PriceType_check" CHECK ("PriceType" IN ('retail', 'wholesale', 'member')),
    CONSTRAINT "ProductPrices_SellingPrice_check" CHECK ("SellingPrice" >= 0),
    CONSTRAINT "ProductPrices_CostPrice_check" CHECK ("CostPrice" >= 0)
);
CREATE INDEX "ProductPrices_ProductId_idx" ON "products"."ProductPrices" ("ProductId");
CREATE INDEX "ProductPrices_StoreId_idx" ON "products"."ProductPrices" ("StoreId");
CREATE INDEX "ProductPrices_PriceType_idx" ON "products"."ProductPrices" ("PriceType");
-- Staff schema: staff, shifts, cash registers, register sessions, cash movements
CREATE SCHEMA "staff";

-- Staff: operational staff data. Credentials remain in Neon Auth.
CREATE TABLE "staff"."Staff" (
    "Id" text PRIMARY KEY NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid REFERENCES "core"."Stores"("Id") ON DELETE SET NULL,
    "UserId" text,
    "Name" text NOT NULL,
    "Email" text NOT NULL,
    "Role" text NOT NULL DEFAULT 'cashier' REFERENCES "core"."Roles"("Code") ON DELETE RESTRICT,
    "Status" text NOT NULL DEFAULT 'active',
    "JoinedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "LastActive" timestamp with time zone,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "Staff_BusinessId_Email_key" UNIQUE ("BusinessId", "Email"),
    CONSTRAINT "Staff_Status_check" CHECK ("Status" IN ('active', 'inactive', 'suspended'))
);
CREATE INDEX "Staff_BusinessId_idx" ON "staff"."Staff" ("BusinessId");
CREATE INDEX "Staff_StoreId_idx" ON "staff"."Staff" ("StoreId");
CREATE INDEX "Staff_UserId_idx" ON "staff"."Staff" ("UserId");
CREATE INDEX "Staff_Role_idx" ON "staff"."Staff" ("Role");
CREATE INDEX "Staff_Status_idx" ON "staff"."Staff" ("Status");

-- Shifts: staff work shifts.
CREATE TABLE "staff"."Shifts" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL REFERENCES "core"."Stores"("Id") ON DELETE CASCADE,
    "StaffId" text NOT NULL REFERENCES "staff"."Staff"("Id") ON DELETE RESTRICT,
    "StartTime" timestamp with time zone NOT NULL,
    "EndTime" timestamp with time zone,
    "Status" text NOT NULL DEFAULT 'scheduled',
    "Notes" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Shifts_Status_check" CHECK ("Status" IN ('scheduled', 'active', 'completed', 'cancelled'))
);
CREATE INDEX "Shifts_BusinessId_idx" ON "staff"."Shifts" ("BusinessId");
CREATE INDEX "Shifts_StoreId_idx" ON "staff"."Shifts" ("StoreId");
CREATE INDEX "Shifts_StaffId_idx" ON "staff"."Shifts" ("StaffId");
CREATE INDEX "Shifts_StartTime_idx" ON "staff"."Shifts" ("StartTime");

-- CashRegisters: physical cash register / payment point.
CREATE TABLE "staff"."CashRegisters" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL REFERENCES "core"."Stores"("Id") ON DELETE CASCADE,
    "Name" text NOT NULL,
    "Code" text NOT NULL,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CashRegisters_StoreId_Code_key" UNIQUE ("StoreId", "Code")
);
CREATE INDEX "CashRegisters_BusinessId_idx" ON "staff"."CashRegisters" ("BusinessId");
CREATE INDEX "CashRegisters_StoreId_idx" ON "staff"."CashRegisters" ("StoreId");

-- CashRegisterSessions: open/close register sessions.
CREATE TABLE "staff"."CashRegisterSessions" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "CashRegisterId" uuid NOT NULL REFERENCES "staff"."CashRegisters"("Id") ON DELETE RESTRICT,
    "StoreId" uuid NOT NULL REFERENCES "core"."Stores"("Id") ON DELETE CASCADE,
    "OpenedByStaffId" text NOT NULL REFERENCES "staff"."Staff"("Id") ON DELETE RESTRICT,
    "ClosedByStaffId" text REFERENCES "staff"."Staff"("Id") ON DELETE SET NULL,
    "OpeningBalance" numeric(14, 2) NOT NULL DEFAULT '0',
    "ClosingBalance" numeric(14, 2),
    "ExpectedBalance" numeric(14, 2),
    "Difference" numeric(14, 2),
    "Status" text NOT NULL DEFAULT 'open',
    "OpenedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "ClosedAt" timestamp with time zone,
    "Notes" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CashRegisterSessions_Status_check" CHECK ("Status" IN ('open', 'closed', 'voided')),
    CONSTRAINT "CashRegisterSessions_OpeningBalance_check" CHECK ("OpeningBalance" >= 0)
);
CREATE INDEX "CashRegisterSessions_CashRegisterId_idx" ON "staff"."CashRegisterSessions" ("CashRegisterId");
CREATE INDEX "CashRegisterSessions_StoreId_idx" ON "staff"."CashRegisterSessions" ("StoreId");
CREATE INDEX "CashRegisterSessions_OpenedByStaffId_idx" ON "staff"."CashRegisterSessions" ("OpenedByStaffId");
CREATE INDEX "CashRegisterSessions_Status_idx" ON "staff"."CashRegisterSessions" ("Status");

-- CashMovements: cash-in / cash-out within a register session.
CREATE TABLE "staff"."CashMovements" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "SessionId" uuid NOT NULL REFERENCES "staff"."CashRegisterSessions"("Id") ON DELETE CASCADE,
    "MovementType" text NOT NULL,
    "Amount" numeric(14, 2) NOT NULL,
    "Reason" text NOT NULL,
    "StaffId" text REFERENCES "staff"."Staff"("Id") ON DELETE SET NULL,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CashMovements_MovementType_check" CHECK ("MovementType" IN ('in', 'out')),
    CONSTRAINT "CashMovements_Amount_check" CHECK ("Amount" >= 0)
);
CREATE INDEX "CashMovements_SessionId_idx" ON "staff"."CashMovements" ("SessionId");
CREATE INDEX "CashMovements_StaffId_idx" ON "staff"."CashMovements" ("StaffId");
CREATE INDEX "CashMovements_CreatedAt_idx" ON "staff"."CashMovements" ("CreatedAt");
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
CREATE INDEX "Reservations_ExpiresAt_idx" ON "inventory"."Reservations" ("ExpiresAt");-- Payments schema: payments, transaction discounts, refunds, refund items
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
-- Audit schema: notifications, audit logs, file attachments
CREATE SCHEMA "audit";

-- Notifications: in-app notifications per user.
CREATE TABLE "audit"."Notifications" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "UserId" text,
    "Type" text NOT NULL,
    "Title" text NOT NULL,
    "Body" text NOT NULL,
    "ReadAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "Notifications_BusinessId_idx" ON "audit"."Notifications" ("BusinessId");
CREATE INDEX "Notifications_UserId_idx" ON "audit"."Notifications" ("UserId");
CREATE INDEX "Notifications_ReadAt_idx" ON "audit"."Notifications" ("ReadAt");
CREATE INDEX "Notifications_CreatedAt_idx" ON "audit"."Notifications" ("CreatedAt");

-- AuditLogs: audit trail for administrative actions.
CREATE TABLE "audit"."AuditLogs" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "UserId" text,
    "Action" text NOT NULL,
    "EntityType" text NOT NULL,
    "EntityId" text,
    "OldValues" jsonb,
    "NewValues" jsonb,
    "IpAddress" text,
    "UserAgent" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "AuditLogs_BusinessId_idx" ON "audit"."AuditLogs" ("BusinessId");
CREATE INDEX "AuditLogs_UserId_idx" ON "audit"."AuditLogs" ("UserId");
CREATE INDEX "AuditLogs_EntityType_EntityId_idx" ON "audit"."AuditLogs" ("EntityType", "EntityId");
CREATE INDEX "AuditLogs_CreatedAt_idx" ON "audit"."AuditLogs" ("CreatedAt");

-- FileAttachments: file metadata; file content lives in object storage.
CREATE TABLE "audit"."FileAttachments" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "EntityType" text NOT NULL,
    "EntityId" text NOT NULL,
    "FileName" text NOT NULL,
    "MimeType" text NOT NULL,
    "SizeBytes" bigint NOT NULL DEFAULT 0,
    "StorageProvider" text NOT NULL DEFAULT 'neon',
    "StorageKey" text NOT NULL,
    "Url" text,
    "UploadedByUserId" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "FileAttachments_BusinessId_idx" ON "audit"."FileAttachments" ("BusinessId");
CREATE INDEX "FileAttachments_EntityType_EntityId_idx" ON "audit"."FileAttachments" ("EntityType", "EntityId");
CREATE INDEX "FileAttachments_StorageKey_idx" ON "audit"."FileAttachments" ("StorageKey");
-- Settings schema: business, store, receipt, profile, notification, privacy, account, appearance, operational, payment, system settings
CREATE SCHEMA "settings";

-- BusinessSettings: business-level settings.
CREATE TABLE "settings"."BusinessSettings" (
    "Id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "BusinessName" text NOT NULL,
    "Address" text NOT NULL DEFAULT '',
    "Phone" text NOT NULL DEFAULT '',
    "Email" text NOT NULL DEFAULT '',
    "Currency" text NOT NULL DEFAULT 'IDR',
    "Timezone" text NOT NULL DEFAULT 'Asia/Jakarta',
    "TaxRate" numeric(5, 4) NOT NULL DEFAULT '0',
    "MemberDiscountRate" numeric(5, 4) NOT NULL DEFAULT '0',
    "LowStockThreshold" integer NOT NULL DEFAULT 10,
    "LegacyReceiptFooter" text NOT NULL DEFAULT '',
    "QrOrderingEnabled" boolean NOT NULL DEFAULT false,
    "QrManualTransferEnabled" boolean NOT NULL DEFAULT false,
    "ManualTransferBankName" text,
    "ManualTransferAccountName" text,
    "ManualTransferAccountNumber" text,
    "ManualTransferInstructions" text,
    "ReservationExpiryMinutes" integer NOT NULL DEFAULT 30,
    "PaymentGatewayModuleStatus" text NOT NULL DEFAULT 'NOT_INSTALLED',
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "BusinessSettings_TaxRate_check" CHECK ("TaxRate" >= 0 AND "TaxRate" <= 1),
    CONSTRAINT "BusinessSettings_MemberDiscountRate_check" CHECK ("MemberDiscountRate" >= 0 AND "MemberDiscountRate" <= 1),
    CONSTRAINT "BusinessSettings_LowStockThreshold_check" CHECK ("LowStockThreshold" >= 0)
);
CREATE INDEX "BusinessSettings_BusinessId_idx" ON "settings"."BusinessSettings" ("BusinessId");

-- StoreSettings: per-store overrides.
CREATE TABLE "settings"."StoreSettings" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid NOT NULL REFERENCES "core"."Stores"("Id") ON DELETE CASCADE,
    "LowStockThreshold" integer,
    "TaxRate" numeric(5, 4),
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "StoreSettings_StoreId_key" UNIQUE ("StoreId"),
    CONSTRAINT "StoreSettings_TaxRate_check" CHECK ("TaxRate" IS NULL OR ("TaxRate" >= 0 AND "TaxRate" <= 1)),
    CONSTRAINT "StoreSettings_LowStockThreshold_check" CHECK ("LowStockThreshold" IS NULL OR "LowStockThreshold" >= 0)
);
CREATE INDEX "StoreSettings_BusinessId_idx" ON "settings"."StoreSettings" ("BusinessId");

-- ReceiptSettings: receipt configuration.
CREATE TABLE "settings"."ReceiptSettings" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "StoreId" uuid REFERENCES "core"."Stores"("Id") ON DELETE CASCADE,
    "Header" text NOT NULL DEFAULT '',
    "Footer" text NOT NULL DEFAULT '',
    "ShowTax" boolean NOT NULL DEFAULT true,
    "ShowCashier" boolean NOT NULL DEFAULT true,
    "PaperWidth" integer NOT NULL DEFAULT 58,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "ReceiptSettings_PaperWidth_check" CHECK ("PaperWidth" IN (58, 80))
);
CREATE INDEX "ReceiptSettings_BusinessId_idx" ON "settings"."ReceiptSettings" ("BusinessId");
CREATE INDEX "ReceiptSettings_StoreId_idx" ON "settings"."ReceiptSettings" ("StoreId");

-- BusinessProfile: public business identity and contact details.
CREATE TABLE "settings"."BusinessProfile" (
    "Id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "BusinessName" text NOT NULL,
    "Address" text NOT NULL DEFAULT '',
    "Phone" text NOT NULL DEFAULT '',
    "Email" text NOT NULL DEFAULT '',
    "LogoUrl" text,
    "Description" text,
    "Website" text,
    "SocialMedia" text,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "BusinessProfile_BusinessId_idx" ON "settings"."BusinessProfile" ("BusinessId");

-- NotificationSettings: notification channel and delivery preferences.
CREATE TABLE "settings"."NotificationSettings" (
    "Id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "EmailEnabled" boolean NOT NULL DEFAULT true,
    "SmsEnabled" boolean NOT NULL DEFAULT false,
    "PushEnabled" boolean NOT NULL DEFAULT true,
    "OrderEmail" boolean NOT NULL DEFAULT true,
    "OrderSms" boolean NOT NULL DEFAULT false,
    "OrderPush" boolean NOT NULL DEFAULT true,
    "LowStockEmail" boolean NOT NULL DEFAULT true,
    "LowStockSms" boolean NOT NULL DEFAULT false,
    "LowStockPush" boolean NOT NULL DEFAULT true,
    "PaymentEmail" boolean NOT NULL DEFAULT true,
    "PaymentSms" boolean NOT NULL DEFAULT false,
    "PaymentPush" boolean NOT NULL DEFAULT true,
    "MarketingEmail" boolean NOT NULL DEFAULT false,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "NotificationSettings_BusinessId_idx" ON "settings"."NotificationSettings" ("BusinessId");

-- PrivacySecuritySettings: data retention, sessions, 2FA.
CREATE TABLE "settings"."PrivacySecuritySettings" (
    "Id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "DataRetentionDays" integer NOT NULL DEFAULT 365,
    "SessionTimeoutMinutes" integer NOT NULL DEFAULT 480,
    "RequireTwoFactor" boolean NOT NULL DEFAULT false,
    "AllowPasswordLogin" boolean NOT NULL DEFAULT true,
    "AllowMagicLink" boolean NOT NULL DEFAULT true,
    "AllowSocialLogin" boolean NOT NULL DEFAULT true,
    "AuditLogEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PrivacySecuritySettings_DataRetentionDays_check" CHECK ("DataRetentionDays" > 0),
    CONSTRAINT "PrivacySecuritySettings_SessionTimeoutMinutes_check" CHECK ("SessionTimeoutMinutes" > 0)
);
CREATE INDEX "PrivacySecuritySettings_BusinessId_idx" ON "settings"."PrivacySecuritySettings" ("BusinessId");

-- AccountSettings: account and user-management preferences.
CREATE TABLE "settings"."AccountSettings" (
    "Id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "DefaultUserRole" text NOT NULL DEFAULT 'cashier',
    "MaxUsers" integer NOT NULL DEFAULT 50,
    "AutoApproveUsers" boolean NOT NULL DEFAULT false,
    "RequireEmailVerification" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "AccountSettings_MaxUsers_check" CHECK ("MaxUsers" > 0)
);
CREATE INDEX "AccountSettings_BusinessId_idx" ON "settings"."AccountSettings" ("BusinessId");

-- AppearanceSettings: theme, language, UI preferences.
CREATE TABLE "settings"."AppearanceSettings" (
    "Id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "Theme" text NOT NULL DEFAULT 'system',
    "PrimaryColor" text NOT NULL DEFAULT '#2563eb',
    "FontFamily" text NOT NULL DEFAULT 'system',
    "Language" text NOT NULL DEFAULT 'id',
    "DateFormat" text NOT NULL DEFAULT 'DD/MM/YYYY',
    "TimeFormat" text NOT NULL DEFAULT '24h',
    "CompactMode" boolean NOT NULL DEFAULT false,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "AppearanceSettings_BusinessId_idx" ON "settings"."AppearanceSettings" ("BusinessId");

-- OperationalSettings: currency, timezone, tax, discounts, stock, reservations.
CREATE TABLE "settings"."OperationalSettings" (
    "Id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "Currency" text NOT NULL DEFAULT 'IDR',
    "Timezone" text NOT NULL DEFAULT 'Asia/Jakarta',
    "TaxRate" numeric(5, 4) NOT NULL DEFAULT '0',
    "MemberDiscountRate" numeric(5, 4) NOT NULL DEFAULT '0',
    "LowStockThreshold" integer NOT NULL DEFAULT 10,
    "ReservationExpiryMinutes" integer NOT NULL DEFAULT 30,
    "AutoCancelUnpaidOrders" boolean NOT NULL DEFAULT true,
    "AllowSplitPayment" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "OperationalSettings_TaxRate_check" CHECK ("TaxRate" >= 0 AND "TaxRate" <= 1),
    CONSTRAINT "OperationalSettings_MemberDiscountRate_check" CHECK ("MemberDiscountRate" >= 0 AND "MemberDiscountRate" <= 1),
    CONSTRAINT "OperationalSettings_LowStockThreshold_check" CHECK ("LowStockThreshold" >= 0)
);
CREATE INDEX "OperationalSettings_BusinessId_idx" ON "settings"."OperationalSettings" ("BusinessId");

-- PaymentSettings: gateway and manual-transfer payment settings.
CREATE TABLE "settings"."PaymentSettings" (
    "Id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "PaymentGatewayModuleStatus" text NOT NULL DEFAULT 'NOT_INSTALLED',
    "QrManualTransferEnabled" boolean NOT NULL DEFAULT false,
    "ManualTransferBankName" text,
    "ManualTransferAccountName" text,
    "ManualTransferAccountNumber" text,
    "ManualTransferInstructions" text,
    "AcceptCash" boolean NOT NULL DEFAULT true,
    "AcceptCard" boolean NOT NULL DEFAULT false,
    "AcceptQris" boolean NOT NULL DEFAULT false,
    "AcceptTransfer" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "PaymentSettings_BusinessId_idx" ON "settings"."PaymentSettings" ("BusinessId");

-- SystemSettings: maintenance, debug, system-level settings.
CREATE TABLE "settings"."SystemSettings" (
    "Id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
    "BusinessId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "core"."Businesses"("Id") ON DELETE CASCADE,
    "MaintenanceMode" boolean NOT NULL DEFAULT false,
    "MaintenanceMessage" text,
    "DebugMode" boolean NOT NULL DEFAULT false,
    "ApiRateLimit" integer NOT NULL DEFAULT 100,
    "EnableApiDocs" boolean NOT NULL DEFAULT false,
    "BackupEnabled" boolean NOT NULL DEFAULT true,
    "BackupFrequency" text NOT NULL DEFAULT 'daily',
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "SystemSettings_BusinessId_idx" ON "settings"."SystemSettings" ("BusinessId");
-- Platform schema: SaaS plans, subscriptions, and provider webhook events.
-- Gumroad remains the source of truth for billing; these tables mirror
-- subscription state locally for entitlements and audit.
CREATE SCHEMA "platform";

-- Plans: one row per Gumroad price/product mapping.
CREATE TABLE "platform"."Plans" (
    "Id" text PRIMARY KEY NOT NULL,
    "Code" text NOT NULL,
    "Name" text NOT NULL,
    "Tier" text NOT NULL,
    "Recurrence" text NOT NULL,
    "IntervalMonths" integer NOT NULL,
    "GumroadProductId" text,
    "PriceCents" integer NOT NULL,
    "Currency" text NOT NULL DEFAULT 'IDR',
    "Entitlements" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Plans_Code_key" UNIQUE ("Code"),
    CONSTRAINT "Plans_GumroadProductId_key" UNIQUE ("GumroadProductId"),
    CONSTRAINT "Plans_Recurrence_check" CHECK ("Recurrence" IN ('monthly', 'quarterly', 'biannually', 'yearly')),
    CONSTRAINT "Plans_IntervalMonths_check" CHECK ("IntervalMonths" > 0),
    CONSTRAINT "Plans_PriceCents_check" CHECK ("PriceCents" >= 0)
);
CREATE INDEX "Plans_Tier_idx" ON "platform"."Plans" ("Tier");
CREATE INDEX "Plans_Recurrence_idx" ON "platform"."Plans" ("Recurrence");

-- Subscriptions: local mirror of a Gumroad membership.
-- BusinessId is nullable until the buyer claims the subscription.
CREATE TABLE "platform"."Subscriptions" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "BusinessId" uuid REFERENCES "core"."Businesses"("Id") ON DELETE SET NULL,
    "Provider" text NOT NULL DEFAULT 'gumroad',
    "ProviderSubscriptionId" text NOT NULL,
    "ProviderUserId" text,
    "PurchaserEmail" text NOT NULL,
    "PlanId" text NOT NULL REFERENCES "platform"."Plans"("Id") ON DELETE RESTRICT,
    "Status" text NOT NULL DEFAULT 'active',
    "Recurrence" text,
    "Quantity" integer NOT NULL DEFAULT 1,
    "StartedAt" timestamp with time zone,
    "CurrentPeriodEnd" timestamp with time zone,
    "CancelAt" timestamp with time zone,
    "EndedAt" timestamp with time zone,
    "LastEventAt" timestamp with time zone,
    "ClaimedAt" timestamp with time zone,
    "ClaimedByUserId" text,
    "Raw" jsonb,
    "CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Subscriptions_Provider_Subscription_key" UNIQUE ("Provider", "ProviderSubscriptionId"),
    CONSTRAINT "Subscriptions_Status_check" CHECK ("Status" IN ('active', 'cancel_at_period_end', 'ended', 'refunded', 'disputed', 'past_due')),
    CONSTRAINT "Subscriptions_Quantity_check" CHECK ("Quantity" > 0)
);
CREATE INDEX "Subscriptions_BusinessId_idx" ON "platform"."Subscriptions" ("BusinessId");
CREATE INDEX "Subscriptions_PurchaserEmail_idx" ON "platform"."Subscriptions" ("PurchaserEmail");
CREATE INDEX "Subscriptions_Status_idx" ON "platform"."Subscriptions" ("Status");

-- WebhookEvents: raw Gumroad payloads for idempotency and replay.
CREATE TABLE "platform"."WebhookEvents" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "Provider" text NOT NULL DEFAULT 'gumroad',
    "Resource" text NOT NULL,
    "EventKey" text NOT NULL,
    "ProviderSubscriptionId" text,
    "SaleId" text,
    "Payload" jsonb NOT NULL,
    "Status" text NOT NULL DEFAULT 'received',
    "Error" text,
    "ReceivedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "ProcessedAt" timestamp with time zone,
    CONSTRAINT "WebhookEvents_Provider_EventKey_key" UNIQUE ("Provider", "EventKey"),
    CONSTRAINT "WebhookEvents_Status_check" CHECK ("Status" IN ('received', 'processed', 'failed', 'ignored'))
);
CREATE INDEX "WebhookEvents_ProviderSubscriptionId_idx" ON "platform"."WebhookEvents" ("ProviderSubscriptionId");
CREATE INDEX "WebhookEvents_Status_idx" ON "platform"."WebhookEvents" ("Status");
