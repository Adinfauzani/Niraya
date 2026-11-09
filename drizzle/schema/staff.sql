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

-- Enable RLS on Staff
ALTER TABLE "staff"."Staff" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read staff of businesses they are active members of
CREATE POLICY "staff_select_member" ON "staff"."Staff"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins can insert staff
CREATE POLICY "staff_insert_admin" ON "staff"."Staff"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

-- Policy: business owners/admins can update staff
CREATE POLICY "staff_update_admin" ON "staff"."Staff"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin'));

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

-- Enable RLS on Shifts
ALTER TABLE "staff"."Shifts" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read shifts of businesses they are active members of
CREATE POLICY "shifts_select_member" ON "staff"."Shifts"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers can insert shifts
CREATE POLICY "shifts_insert_manager" ON "staff"."Shifts"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can update shifts
CREATE POLICY "shifts_update_manager" ON "staff"."Shifts"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

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

-- Enable RLS on CashRegisters
ALTER TABLE "staff"."CashRegisters" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read cash registers of businesses they are active members of
CREATE POLICY "cash_registers_select_member" ON "staff"."CashRegisters"
    FOR SELECT TO authenticated
    USING ("core"."is_business_member"("BusinessId"));

-- Policy: business owners/admins/managers can insert cash registers
CREATE POLICY "cash_registers_insert_manager" ON "staff"."CashRegisters"
    FOR INSERT TO authenticated
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

-- Policy: business owners/admins/managers can update cash registers
CREATE POLICY "cash_registers_update_manager" ON "staff"."CashRegisters"
    FOR UPDATE TO authenticated
    USING ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'))
    WITH CHECK ("core"."has_business_role"("BusinessId", 'owner') OR "core"."has_business_role"("BusinessId", 'admin') OR "core"."has_business_role"("BusinessId", 'manager'));

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

-- Enable RLS on CashRegisterSessions
ALTER TABLE "staff"."CashRegisterSessions" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read register sessions of businesses they are active members of
CREATE POLICY "cash_register_sessions_select_member" ON "staff"."CashRegisterSessions"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "staff"."CashRegisters" cr
      WHERE cr."Id" = "CashRegisterSessions"."CashRegisterId"
        AND "core"."is_business_member"(cr."BusinessId")
    ));

-- Policy: business owners/admins/managers/cashiers can insert register sessions
CREATE POLICY "cash_register_sessions_insert_staff" ON "staff"."CashRegisterSessions"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "staff"."CashRegisters" cr
      WHERE cr."Id" = "CashRegisterSessions"."CashRegisterId"
        AND ("core"."has_business_role"(cr."BusinessId", 'owner') OR "core"."has_business_role"(cr."BusinessId", 'admin') OR "core"."has_business_role"(cr."BusinessId", 'manager') OR "core"."has_business_role"(cr."BusinessId", 'cashier'))
    ));

-- Policy: business owners/admins/managers/cashiers can update register sessions
CREATE POLICY "cash_register_sessions_update_staff" ON "staff"."CashRegisterSessions"
    FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "staff"."CashRegisters" cr
      WHERE cr."Id" = "CashRegisterSessions"."CashRegisterId"
        AND ("core"."has_business_role"(cr."BusinessId", 'owner') OR "core"."has_business_role"(cr."BusinessId", 'admin') OR "core"."has_business_role"(cr."BusinessId", 'manager') OR "core"."has_business_role"(cr."BusinessId", 'cashier'))
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM "staff"."CashRegisters" cr
      WHERE cr."Id" = "CashRegisterSessions"."CashRegisterId"
        AND ("core"."has_business_role"(cr."BusinessId", 'owner') OR "core"."has_business_role"(cr."BusinessId", 'admin') OR "core"."has_business_role"(cr."BusinessId", 'manager') OR "core"."has_business_role"(cr."BusinessId", 'cashier'))
    ));

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

-- Enable RLS on CashMovements
ALTER TABLE "staff"."CashMovements" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read cash movements of businesses they are active members of
CREATE POLICY "cash_movements_select_member" ON "staff"."CashMovements"
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM "staff"."CashRegisterSessions" crs
      JOIN "staff"."CashRegisters" cr ON cr."Id" = crs."CashRegisterId"
      WHERE crs."Id" = "CashMovements"."SessionId"
        AND "core"."is_business_member"(cr."BusinessId")
    ));

-- Policy: business owners/admins/managers/cashiers can insert cash movements
CREATE POLICY "cash_movements_insert_staff" ON "staff"."CashMovements"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM "staff"."CashRegisterSessions" crs
      JOIN "staff"."CashRegisters" cr ON cr."Id" = crs."CashRegisterId"
      WHERE crs."Id" = "CashMovements"."SessionId"
        AND ("core"."has_business_role"(cr."BusinessId", 'owner') OR "core"."has_business_role"(cr."BusinessId", 'admin') OR "core"."has_business_role"(cr."BusinessId", 'manager') OR "core"."has_business_role"(cr."BusinessId", 'cashier'))
    ));
