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

-- Enable RLS on Categories
ALTER TABLE "products"."Categories" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read categories of businesses they are active members of
CREATE POLICY "categories_select_member" ON "products"."Categories"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers can insert categories
CREATE POLICY "categories_insert_manager" ON "products"."Categories"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can update categories
CREATE POLICY "categories_update_manager" ON "products"."Categories"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

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

-- Enable RLS on Products
ALTER TABLE "products"."Products" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read products of businesses they are active members of
CREATE POLICY "products_select_member" ON "products"."Products"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers can insert products
CREATE POLICY "products_insert_manager" ON "products"."Products"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can update products
CREATE POLICY "products_update_manager" ON "products"."Products"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

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

-- Enable RLS on ProductVariants
ALTER TABLE "products"."ProductVariants" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read variants of businesses they are active members of
CREATE POLICY "product_variants_select_member" ON "products"."ProductVariants"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers can insert variants
CREATE POLICY "product_variants_insert_manager" ON "products"."ProductVariants"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can update variants
CREATE POLICY "product_variants_update_manager" ON "products"."ProductVariants"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

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

-- Enable RLS on ProductPrices
ALTER TABLE "products"."ProductPrices" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read prices of businesses they are active members of (via store)
CREATE POLICY "product_prices_select_member" ON "products"."ProductPrices"
    FOR SELECT TO authenticated
    USING (
      "StoreId" IS NULL OR EXISTS (
        SELECT 1 FROM "core"."Stores" s
        WHERE s."Id" = "ProductPrices"."StoreId"
          AND "core"."is_business_member"(s."BusinessId")
      )
    );

-- Policy: business owners/admins/managers can insert prices
CREATE POLICY "product_prices_insert_manager" ON "products"."ProductPrices"
    FOR INSERT TO authenticated
    WITH CHECK (
      "StoreId" IS NULL OR EXISTS (
        SELECT 1 FROM "core"."Stores" s
        WHERE s."Id" = "ProductPrices"."StoreId"
          AND ("core"."has_business_role"(s."BusinessId", 'owner') OR "core"."has_business_role"(s."BusinessId", 'admin') OR "core"."has_business_role"(s."BusinessId", 'manager'))
      )
    );

-- Policy: business owners/admins/managers can update prices
CREATE POLICY "product_prices_update_manager" ON "products"."ProductPrices"
    FOR UPDATE TO authenticated
    USING (
      "StoreId" IS NULL OR EXISTS (
        SELECT 1 FROM "core"."Stores" s
        WHERE s."Id" = "ProductPrices"."StoreId"
          AND ("core"."has_business_role"(s."BusinessId", 'owner') OR "core"."has_business_role"(s."BusinessId", 'admin') OR "core"."has_business_role"(s."BusinessId", 'manager'))
      )
    )
    WITH CHECK (
      "StoreId" IS NULL OR EXISTS (
        SELECT 1 FROM "core"."Stores" s
        WHERE s."Id" = "ProductPrices"."StoreId"
          AND ("core"."has_business_role"(s."BusinessId", 'owner') OR "core"."has_business_role"(s."BusinessId", 'admin') OR "core"."has_business_role"(s."BusinessId", 'manager'))
      )
    );
