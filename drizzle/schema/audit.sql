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
