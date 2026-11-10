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
