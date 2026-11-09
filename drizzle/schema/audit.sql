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

-- Enable RLS on Notifications
ALTER TABLE "audit"."Notifications" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read their own notifications
CREATE POLICY "notifications_select_own" ON "audit"."Notifications"
    FOR SELECT TO authenticated
    USING ("UserId" = auth.uid()::text);

-- Policy: business owners/admins/managers can read all notifications for their business
CREATE POLICY "notifications_select_admin" ON "audit"."Notifications"
    FOR SELECT TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can insert notifications
CREATE POLICY "notifications_insert_manager" ON "audit"."Notifications"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: authenticated users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON "audit"."Notifications"
    FOR UPDATE TO authenticated
    USING ("UserId" = auth.uid()::text)
    WITH CHECK ("UserId" = auth.uid()::text);

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

-- Enable RLS on AuditLogs
ALTER TABLE "audit"."AuditLogs" ENABLE ROW LEVEL SECURITY;

-- Policy: business owners/admins can read audit logs for their business
CREATE POLICY "audit_logs_select_admin" ON "audit"."AuditLogs"
    FOR SELECT TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

-- Policy: system can insert audit logs (via service role or admin)
CREATE POLICY "audit_logs_insert_admin" ON "audit"."AuditLogs"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

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

-- Enable RLS on FileAttachments
ALTER TABLE "audit"."FileAttachments" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read file attachments of businesses they are active members of
CREATE POLICY "file_attachments_select_member" ON "audit"."FileAttachments"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers can insert file attachments
CREATE POLICY "file_attachments_insert_manager" ON "audit"."FileAttachments"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can update file attachments
CREATE POLICY "file_attachments_update_manager" ON "audit"."FileAttachments"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));
