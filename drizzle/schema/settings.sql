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

-- Enable RLS on BusinessSettings
ALTER TABLE "settings"."BusinessSettings" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read business settings of businesses they are active members of
CREATE POLICY "business_settings_select_member" ON "settings"."BusinessSettings"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins can update business settings
CREATE POLICY "business_settings_update_admin" ON "settings"."BusinessSettings"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

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

-- Enable RLS on StoreSettings
ALTER TABLE "settings"."StoreSettings" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read store settings of businesses they are active members of
CREATE POLICY "store_settings_select_member" ON "settings"."StoreSettings"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers can insert store settings
CREATE POLICY "store_settings_insert_manager" ON "settings"."StoreSettings"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can update store settings
CREATE POLICY "store_settings_update_manager" ON "settings"."StoreSettings"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

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

-- Enable RLS on ReceiptSettings
ALTER TABLE "settings"."ReceiptSettings" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read receipt settings of businesses they are active members of
CREATE POLICY "receipt_settings_select_member" ON "settings"."ReceiptSettings"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers can insert receipt settings
CREATE POLICY "receipt_settings_insert_manager" ON "settings"."ReceiptSettings"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can update receipt settings
CREATE POLICY "receipt_settings_update_manager" ON "settings"."ReceiptSettings"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

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

-- Enable RLS on BusinessProfile
ALTER TABLE "settings"."BusinessProfile" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read business profile of businesses they are active members of
CREATE POLICY "business_profile_select_member" ON "settings"."BusinessProfile"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins can update business profile
CREATE POLICY "business_profile_update_admin" ON "settings"."BusinessProfile"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

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

-- Enable RLS on NotificationSettings
ALTER TABLE "settings"."NotificationSettings" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read notification settings of businesses they are active members of
CREATE POLICY "notification_settings_select_member" ON "settings"."NotificationSettings"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins can update notification settings
CREATE POLICY "notification_settings_update_admin" ON "settings"."NotificationSettings"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

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

-- Enable RLS on PrivacySecuritySettings
ALTER TABLE "settings"."PrivacySecuritySettings" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read privacy security settings of businesses they are active members of
CREATE POLICY "privacy_security_settings_select_member" ON "settings"."PrivacySecuritySettings"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins can update privacy security settings
CREATE POLICY "privacy_security_settings_update_admin" ON "settings"."PrivacySecuritySettings"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

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

-- Enable RLS on AccountSettings
ALTER TABLE "settings"."AccountSettings" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read account settings of businesses they are active members of
CREATE POLICY "account_settings_select_member" ON "settings"."AccountSettings"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins can update account settings
CREATE POLICY "account_settings_update_admin" ON "settings"."AccountSettings"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

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

-- Enable RLS on AppearanceSettings
ALTER TABLE "settings"."AppearanceSettings" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read appearance settings of businesses they are active members of
CREATE POLICY "appearance_settings_select_member" ON "settings"."AppearanceSettings"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins can update appearance settings
CREATE POLICY "appearance_settings_update_admin" ON "settings"."AppearanceSettings"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

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

-- Enable RLS on OperationalSettings
ALTER TABLE "settings"."OperationalSettings" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read operational settings of businesses they are active members of
CREATE POLICY "operational_settings_select_member" ON "settings"."OperationalSettings"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins can update operational settings
CREATE POLICY "operational_settings_update_admin" ON "settings"."OperationalSettings"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

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

-- Enable RLS on PaymentSettings
ALTER TABLE "settings"."PaymentSettings" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read payment settings of businesses they are active members of
CREATE POLICY "payment_settings_select_member" ON "settings"."PaymentSettings"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins can update payment settings
CREATE POLICY "payment_settings_update_admin" ON "settings"."PaymentSettings"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

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

-- Enable RLS on SystemSettings
ALTER TABLE "settings"."SystemSettings" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read system settings of businesses they are active members of
CREATE POLICY "system_settings_select_member" ON "settings"."SystemSettings"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins can update system settings
CREATE POLICY "system_settings_update_admin" ON "settings"."SystemSettings"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));
