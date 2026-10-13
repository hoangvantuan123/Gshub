-- Add missing permission structures without seeding or changing grants.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "_ERPUsers" ADD COLUMN IF NOT EXISTS "PartSeq" BIGINT;
ALTER TABLE "_ERPUsers" ADD COLUMN IF NOT EXISTS "ProdDepartSeq" BIGINT;
ALTER TABLE "_ERPUsers" ADD COLUMN IF NOT EXISTS "PositionSeq" BIGINT;
ALTER TABLE "_ERPUsers" ADD COLUMN IF NOT EXISTS "CanScanQR" BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS "_ERPDepartment" (
    "IdSeq" BIGSERIAL PRIMARY KEY, "DepartmentName" TEXT
);
CREATE TABLE IF NOT EXISTS "_ERPProdLocation" (
    "IdSeq" BIGSERIAL PRIMARY KEY, "ProdLocationName" TEXT
);
CREATE TABLE IF NOT EXISTS "_ERPPosition" (
    "IdSeq" BIGSERIAL PRIMARY KEY, "PositionName" TEXT
);

CREATE TABLE IF NOT EXISTS "_ERPGroupActionPerms" (
    "Idseq" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "Name" TEXT, "ScreenName" TEXT, "Comment" TEXT, "IdxNo" INTEGER,
    "CreatedBy" VARCHAR(36), "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy" VARCHAR(36), "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "_ERPGroupActionPermsItems" (
    "Id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "IdxNo" INTEGER, "ScreenName" TEXT,
    "ViewScreen" BOOLEAN DEFAULT false, "EditScreen" BOOLEAN DEFAULT false,
    "GroupActionPermsId" VARCHAR(36), "GroupSeq" VARCHAR(36),
    "UserSeq" VARCHAR(36), "Type" VARCHAR(50),
    "CreatedBy" VARCHAR(36), "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy" VARCHAR(36), "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_group_action_items_groupseq"
    ON "_ERPGroupActionPermsItems" ("GroupSeq");

CREATE TABLE IF NOT EXISTS "_ERPPermResourceActions" (
    "IdSeq" VARCHAR(36) PRIMARY KEY,
    "ResourceSeq" VARCHAR(50), "ActionSeq" VARCHAR(36),
    "CustomActionName" TEXT, "IsDefaultAllow" BOOLEAN DEFAULT false,
    "OrderNo" INTEGER DEFAULT 0, "Comment" TEXT,
    "RowVersion" BIGINT DEFAULT 1, "IdxNo" INTEGER,
    "CreatedBy" VARCHAR(36), "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy" VARCHAR(36), "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "_ERPPermResourceFields" (
    "IdSeq" VARCHAR(36) PRIMARY KEY,
    "ResourceSeq" VARCHAR(50), "FieldSeq" VARCHAR(36),
    "CustomFieldName" TEXT, "IsMaskable" BOOLEAN DEFAULT false,
    "IsSensitive" BOOLEAN DEFAULT false,
    "OrderNo" INTEGER DEFAULT 0, "Comment" TEXT,
    "RowVersion" BIGINT DEFAULT 1, "IdxNo" INTEGER,
    "CreatedBy" VARCHAR(36), "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy" VARCHAR(36), "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "_ERPPermResourceScopes" (
    "IdSeq" VARCHAR(36) PRIMARY KEY,
    "ResourceSeq" VARCHAR(50), "ScopeSeq" VARCHAR(36),
    "CustomScopeName" TEXT,
    "OrderNo" INTEGER DEFAULT 0, "Comment" TEXT,
    "RowVersion" BIGINT DEFAULT 1, "IdxNo" INTEGER,
    "CreatedBy" VARCHAR(36), "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy" VARCHAR(36), "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);
COMMIT;
