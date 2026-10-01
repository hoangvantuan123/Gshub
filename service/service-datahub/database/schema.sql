-- =============================================================================
-- DATABASE: DATAHUB (PostgreSQL)
-- MODULE: AUTHENTICATION, USER REGISTRATION, ROLES & PERMISSIONS,
--         ERP DATAHUB GATEWAY, TOKEN SESSIONS & AUDIT LOGS
-- =============================================================================

-- =============================================================================
-- 1. BẢNG TÀI KHOẢN NGƯỜI DÙNG (_ERPUsers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPUsers" (
    "UserSeq"            VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "CompanySeq"         INTEGER DEFAULT 1,
    "IdxNo"              INTEGER DEFAULT 1,
    "EmpID"              VARCHAR(50),
    "EmpCode"            VARCHAR(50),
    "EmpName"            VARCHAR(255),
    "DeptName"           VARCHAR(255),
    "ManagerName"        VARCHAR(255),
    "UserId"             VARCHAR(100) NOT NULL UNIQUE,
    "UserType"           INTEGER DEFAULT 1,
    "UserName"           VARCHAR(255),
    "EmpSeq"             INTEGER DEFAULT 1,
    "LoginPwd"           TEXT,
    "Password1"          TEXT,
    "Password2"          TEXT, -- Bcrypt Password Hash
    "Password3"          TEXT,
    "LoginStatus"        INTEGER DEFAULT 0,
    "LoginDate"          VARCHAR(50),
    "PwdChgDate"         VARCHAR(50),
    "PassHis"            TEXT,
    "Email"              VARCHAR(255),
    "IsOtpVerified"      BOOLEAN DEFAULT false,
    "IsEmailVerified"    BOOLEAN DEFAULT false,
    "LoginFailCnt"       INTEGER DEFAULT 0,
    "PwdType"            VARCHAR(50),
    "LoginType"          INTEGER DEFAULT 1,
    "ManagementType"     INTEGER DEFAULT 1,
    "LastUserSeq"        VARCHAR(36),
    "LastDateTime"       TIMESTAMPTZ,
    "Dsn"                VARCHAR(255),
    "Remark"             TEXT,
    "UserlimitDate"      VARCHAR(50),
    "LoginFailFirstTime" TIMESTAMPTZ,
    "IsLayoutAdmin"      INTEGER DEFAULT 0,
    "IsGroupWareUser"    VARCHAR(10) DEFAULT '0',
    "SMUserType"         INTEGER DEFAULT 0,
    "LicenseType"        INTEGER DEFAULT 1,
    "CheckPass1"         BOOLEAN DEFAULT true,
    "StatusAcc"          BOOLEAN DEFAULT false, -- false = bình thường, true = bị khóa
    "Status"             VARCHAR(50) DEFAULT 'ACTIVE',
    "Active"             BOOLEAN DEFAULT true,
    "LanguageSeq"        INTEGER DEFAULT 6, -- 6 = Tiếng Việt
    "CreatedBy"          VARCHAR(36),
    "CreatedAt"          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"          VARCHAR(36),
    "UpdatedAt"          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_users_userid" ON "_ERPUsers" (LOWER("UserId"));
CREATE INDEX IF NOT EXISTS "idx_users_empid" ON "_ERPUsers" ("EmpID");
CREATE INDEX IF NOT EXISTS "idx_users_empcode" ON "_ERPUsers" ("EmpCode");
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "_ERPUsers" ("Active");
CREATE INDEX IF NOT EXISTS "idx_users_createdat" ON "_ERPUsers" ("CreatedAt");

-- =============================================================================
-- 2. BẢNG CHI TIẾT NGƯỜI DÙNG / NHÂN VIÊN (_ERPUserDetails)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPUserDetails" (
    "IdSeq"         BIGSERIAL PRIMARY KEY,
    "UserSeq"       VARCHAR(36), -- UUIDv7
    "PartSeq"       INTEGER,
    "ProdDepartSeq" INTEGER,
    "PositionSeq"   INTEGER,
    "CanScanQR"     BOOLEAN DEFAULT false,
    "IsActive"      BOOLEAN DEFAULT true,
    "IdxNo"         INTEGER DEFAULT 1,
    "CreatedBy"     VARCHAR(36),
    "CreatedAt"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"     VARCHAR(36),
    "UpdatedAt"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_userdetails_userseq" ON "_ERPUserDetails" ("UserSeq");

-- =============================================================================
-- 3. BẢNG ROOT MENUS - MENU GỐC (_ERPRootMenus)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPRootMenus" (
    "Id"          BIGSERIAL PRIMARY KEY,
    "Key"         VARCHAR(100) NOT NULL UNIQUE,
    "IdxNo"       INTEGER DEFAULT 0,
    "Label"       VARCHAR(255),
    "Icon"        VARCHAR(100),
    "Link"        VARCHAR(255),
    "Utilities"   BOOLEAN DEFAULT true,
    "CreatedBy"   VARCHAR(100),
    "CreatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"   VARCHAR(100),
    "UpdatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_root_menus_key" ON "_ERPRootMenus" ("Key");
CREATE INDEX IF NOT EXISTS "idx_root_menus_idxno" ON "_ERPRootMenus" ("IdxNo" ASC NULLS LAST);

-- =============================================================================
-- 4. BẢNG MENUS & SUBMENUS (_ERPMenus)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPMenus" (
    "Id"            BIGSERIAL PRIMARY KEY,
    "MenuRootId"    BIGINT,
    "MenuSubRootId" BIGINT,
    "Key"           VARCHAR(100) NOT NULL,
    "Label"         VARCHAR(255),
    "Link"          VARCHAR(255),
    "Type"          VARCHAR(50) DEFAULT 'menu', -- 'menu', 'menuitem', 'action'
    "OrderSeq"      INTEGER DEFAULT 0,
    "DictSeq"       INTEGER DEFAULT 0,
    "IdxNo"         INTEGER DEFAULT 0,
    "CreatedBy"     VARCHAR(100),
    "CreatedAt"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"     VARCHAR(100),
    "UpdatedAt"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_menus_rootid" ON "_ERPMenus" ("MenuRootId");
CREATE INDEX IF NOT EXISTS "idx_menus_subrootid" ON "_ERPMenus" ("MenuSubRootId");
CREATE INDEX IF NOT EXISTS "idx_menus_key" ON "_ERPMenus" ("Key");
CREATE INDEX IF NOT EXISTS "idx_menus_idxno" ON "_ERPMenus" ("IdxNo" ASC NULLS LAST);

-- =============================================================================
-- 5. BẢNG NHÓM QUYỀN HỆ THỐNG (_ERPGroups)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPGroups" (
    "Id"          BIGSERIAL PRIMARY KEY,
    "Name"        VARCHAR(255) NOT NULL,
    "Comment"     TEXT,
    "IdxNo"       INTEGER DEFAULT 0,
    "RowVersion"  BIGINT DEFAULT 1,
    "CreatedBy"   VARCHAR(100),
    "CreatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"   VARCHAR(100),
    "UpdatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 6. BẢNG PHÂN QUYỀN NGƯỜI DÙNG - MENU (_ERPRolesUsers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPRolesUsers" (
    "Id"          BIGSERIAL PRIMARY KEY,
    "GroupId"     BIGINT,
    "UserId"      VARCHAR(100) NOT NULL,
    "MenuId"      BIGINT,
    "RootMenuId"  BIGINT,
    "Type"        VARCHAR(50) DEFAULT 'menu', -- 'rootmenu', 'menu', 'menuitem'
    "Name"        VARCHAR(255),
    "View"        BOOLEAN DEFAULT true,
    "Create"      BOOLEAN DEFAULT true,
    "Edit"        BOOLEAN DEFAULT true,
    "Delete"      BOOLEAN DEFAULT true,
    "CreatedBy"   VARCHAR(100),
    "CreatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"   VARCHAR(100),
    "UpdatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_roles_users_userid" ON "_ERPRolesUsers" (LOWER("UserId"));
CREATE INDEX IF NOT EXISTS "idx_roles_users_groupid" ON "_ERPRolesUsers" ("GroupId");
CREATE INDEX IF NOT EXISTS "idx_roles_users_menuid" ON "_ERPRolesUsers" ("MenuId");

-- =============================================================================
-- 7. BẢNG NHẬT KÝ ĐĂNG NHẬP (_ERPLoginLogs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPLoginLogs" (
    "Id"         BIGSERIAL PRIMARY KEY,
    "UserId"     VARCHAR(100) NOT NULL,
    "UserSeq"    VARCHAR(36), -- UUIDv7
    "Status"     VARCHAR(50), -- 'SUCCESS', 'INVALID_CREDENTIALS', 'ACCOUNT_LOCKED', etc.
    "IpAddress"  VARCHAR(50),
    "UserAgent"  VARCHAR(500),
    "DeviceInfo" TEXT,
    "CreatedAt"  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_login_logs_userid" ON "_ERPLoginLogs" (LOWER("UserId"));
CREATE INDEX IF NOT EXISTS "idx_login_logs_createdat" ON "_ERPLoginLogs" ("CreatedAt");

-- =============================================================================
-- 8. BẢNG CẤU HÌNH KẾT NỐI ERP (ErpConfig)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "ErpConfig" (
    "ConfigKey"          VARCHAR(100) PRIMARY KEY,
    "ConfigName"         VARCHAR(255) NOT NULL,
    "Provider"           VARCHAR(50) DEFAULT 'Bravo',
    "AuthUrl"            VARCHAR(500) NOT NULL,
    "BaseApiUrl"         VARCHAR(500) NOT NULL,
    "Referer"            VARCHAR(500),
    "ClientId"           VARCHAR(255),
    "ClientSecret"       VARCHAR(255),
    "DeviceCode"         VARCHAR(255),
    "ConnectionName"     VARCHAR(100) DEFAULT 'Default',
    "GrantType"          VARCHAR(50) DEFAULT 'password',
    "Scope"              VARCHAR(255) DEFAULT 'ApiGateway offline_access',
    "InsecureSkipVerify" BOOLEAN DEFAULT true,
    "ExtraParams"        JSONB,
    "IsActive"           BOOLEAN DEFAULT true,
    "CreatedAt"          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt"          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_erpconfig_provider" ON "ErpConfig"("Provider");
CREATE INDEX IF NOT EXISTS "idx_erpconfig_isactive" ON "ErpConfig"("IsActive");

-- =============================================================================
-- 9. BẢNG LƯU PHIÊN TOKEN OAUTH ERP (TokenSession)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "TokenSession" (
    "Id"           SERIAL PRIMARY KEY,
    "ConfigKey"    VARCHAR(100) NOT NULL,
    "Username"     VARCHAR(100) NOT NULL,
    "AccessToken"  TEXT NOT NULL,
    "TokenType"    VARCHAR(50) DEFAULT 'Bearer',
    "RefreshToken" TEXT,
    "ExpiresIn"    BIGINT,
    "ExpiresAt"    TIMESTAMPTZ NOT NULL,
    "Scope"        VARCHAR(255),
    "RawResponse"  TEXT,
    "CreatedAt"    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt"    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("ConfigKey", "Username"),
    CONSTRAINT "Fk_TokenSession_Config" FOREIGN KEY ("ConfigKey") REFERENCES "ErpConfig"("ConfigKey") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_tokensession_expiresat" ON "TokenSession"("ExpiresAt");

-- =============================================================================
-- 10. BẢNG GHI NHẬT KÝ TRUY VẤN AUDIT (AuditLog)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "Id"             SERIAL PRIMARY KEY,
    "TraceId"        VARCHAR(64),
    "ConfigKey"      VARCHAR(100),
    "Username"       VARCHAR(100),
    "Method"         VARCHAR(10),
    "Endpoint"       VARCHAR(500),
    "TargetUrl"      VARCHAR(500),
    "StatusCode"     INT,
    "LatencyMs"      BIGINT,
    "ClientIp"       VARCHAR(50),
    "UserAgent"      VARCHAR(500),
    "RequestPayload" TEXT,
    "ResponseBrief"  TEXT,
    "ErrorMessage"   TEXT,
    "CreatedAt"      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_auditlog_traceid" ON "AuditLog"("TraceId");
CREATE INDEX IF NOT EXISTS "idx_auditlog_configkey" ON "AuditLog"("ConfigKey");
CREATE INDEX IF NOT EXISTS "idx_auditlog_createdat" ON "AuditLog"("CreatedAt");

-- =============================================================================
-- 11. BẢNG CẤU HÌNH ENDPOINT ERP DYNAMIC (ErpEndpoint)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "ErpEndpoint" (
    "EndpointKey" VARCHAR(100) PRIMARY KEY,
    "ConfigKey"   VARCHAR(100) NOT NULL DEFAULT 'BravoDefault',
    "Endpoint"    VARCHAR(500) NOT NULL,
    "Stn"         VARCHAR(100),
    "San"         VARCHAR(100),
    "Alc"         TEXT,
    "Ndcn"        VARCHAR(100),
    "Nocn"        VARCHAR(100),
    "Necn"        VARCHAR(100),
    "Nrcn"        VARCHAR(100),
    "Fields"      TEXT,
    "Description" VARCHAR(500),
    "IsActive"    BOOLEAN DEFAULT true,
    "CreatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Fk_ErpEndpoint_Config" FOREIGN KEY ("ConfigKey") REFERENCES "ErpConfig"("ConfigKey") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_erpendpoint_configkey" ON "ErpEndpoint"("ConfigKey");
CREATE INDEX IF NOT EXISTS "idx_erpendpoint_isactive" ON "ErpEndpoint"("IsActive");

-- =============================================================================
-- 12. DỮ LIỆU SEED MẪU MẶC ĐỊNH (BOOTSTRAP SEED DATA)
-- =============================================================================

-- 12.1. Seed Tài khoản Quản trị viên (SuperAdmin, Admin, IT) với UUIDv7 và Bcrypt
INSERT INTO "_ERPUsers" (
    "UserSeq", "CompanySeq", "IdxNo", "EmpID", "EmpCode", "EmpName",
    "DeptName", "ManagerName", "UserId", "UserType", "UserName", "EmpSeq",
    "Password2", "CheckPass1", "StatusAcc", "Status", "Active", "LanguageSeq", "CreatedBy"
) VALUES
(
    '01a0ecf1-c477-7a38-b4c1-34c0a7a7b292', 1, 1, 'superadmin', 'SUPERADMIN', 'Super Administrator',
    'Ban Điều Hành', 'Tổng Giám Đốc', 'superadmin', 1, 'Super Admin', 1,
    '$2a$10$QXZ/sPtp7jRG4sbuKQdrhOTKV7G1CDAwMuhugkzAYsGs3jn.kFsE6', true, false, 'ACTIVE', true, 6, 'SYSTEM_INIT' -- Mật khẩu: Admin@123
),
(
    '01a0ecf1-c408-741c-ba35-2f8a0d3788bc', 1, 2, 'admin', 'ADMIN', 'Quản trị viên Hệ thống',
    'Ban Giám Đốc', 'Giám Đốc', 'admin', 1, 'Admin', 1,
    '$2a$10$QXZ/sPtp7jRG4sbuKQdrhOTKV7G1CDAwMuhugkzAYsGs3jn.kFsE6', true, false, 'ACTIVE', true, 6, 'SYSTEM_INIT' -- Mật khẩu: Admin@123
),
(
    '01a0ecf1-c441-7803-8e98-3452a268800a', 1, 3, 'IT_TUANHV', 'IT_TUANHV', 'Hoàng Văn Tuấn',
    'Phòng Công Nghệ Thông Tin', 'Trưởng Phòng IT', 'IT_TUANHV', 1, 'IT_TUANHV', 1,
    '$2a$10$I5w4wR8RihIslif36IAkBuxXhpnr7V70nsjDzD/z9EVRvulbhXI2K', true, false, 'ACTIVE', true, 6, 'SYSTEM_INIT' -- Mật khẩu: Tuan3112@
)
ON CONFLICT ("UserId") DO UPDATE SET
    "Password2" = EXCLUDED."Password2",
    "CheckPass1" = true,
    "StatusAcc" = false,
    "Active" = true;

-- 12.2. Seed Nhóm quyền (Groups)
INSERT INTO "_ERPGroups" ("Id", "Name", "Comment", "IdxNo", "CreatedBy") VALUES
(1, 'Super Administrators', 'Nhóm quản trị viên tối cao toàn quyền hệ thống', 1, 'SYSTEM_INIT'),
(2, 'Ban Giám Đốc', 'Nhóm lãnh đạo và quản lý cấp cao', 2, 'SYSTEM_INIT'),
(3, 'Phòng CNTT & Kỹ Thuật', 'Nhóm vận hành hệ thống và cấu hình DataHub', 3, 'SYSTEM_INIT')
ON CONFLICT ("Id") DO NOTHING;

-- 12.3. Seed Danh mục Menu Gốc (Root Menus)
INSERT INTO "_ERPRootMenus" ("Id", "Key", "IdxNo", "Label", "Icon", "Link", "Utilities", "CreatedBy") VALUES
(1, 'SYSTEM', 1, 'Hệ Thống', 'Settings', '/system', true, 'SYSTEM_INIT'),
(2, 'PRODUCTION', 2, 'Sản Xuất', 'Cpu', '/production', true, 'SYSTEM_INIT'),
(3, 'REPORT', 3, 'Báo Cáo Thống Kê', 'FileText', '/report', true, 'SYSTEM_INIT'),
(4, 'UTILITIES', 4, 'Tiện Ích & Cấu Hình', 'SlidersHorizontal', '/utilities', true, 'SYSTEM_INIT')
ON CONFLICT ("Id") DO NOTHING;

-- 12.4. Seed Menu con & Chức năng
INSERT INTO "_ERPMenus" ("Id", "MenuRootId", "Key", "Label", "Link", "Type", "OrderSeq", "CreatedBy") VALUES
(1, 1, 'USERS_MGT', 'Quản Lý Người Dùng', '/system/users', 'menu', 1, 'SYSTEM_INIT'),
(2, 1, 'ROLES_MGT', 'Phân Quyền & Vai Trò', '/system/roles', 'menu', 2, 'SYSTEM_INIT'),
(3, 2, 'WORK_PROCESS', 'Lệnh Công Đoạn (WorkProcess)', '/production/work-process', 'menu', 1, 'SYSTEM_INIT'),
(4, 2, 'ORDER_SETTLE', 'Quyết Toán Lệnh', '/production/order-settlement', 'menu', 2, 'SYSTEM_INIT'),
(5, 3, 'PROD_STATS', 'Báo Cáo Sản Xuất Hằng Ngày', '/report/production-statistics', 'menu', 1, 'SYSTEM_INIT'),
(6, 4, 'DATAHUB_CONFIG', 'Cấu Hình Cổng DataHub', '/utilities/datahub-config', 'menu', 1, 'SYSTEM_INIT')
ON CONFLICT ("Id") DO NOTHING;

-- 12.5. Cấp toàn quyền cho SuperAdmin và Admin
INSERT INTO "_ERPRolesUsers" ("GroupId", "UserId", "RootMenuId", "Type", "Name", "View", "Create", "Edit", "Delete", "CreatedBy") VALUES
(1, 'superadmin', 1, 'rootmenu', 'Hệ Thống', true, true, true, true, 'SYSTEM_INIT'),
(1, 'superadmin', 2, 'rootmenu', 'Sản Xuất', true, true, true, true, 'SYSTEM_INIT'),
(1, 'superadmin', 3, 'rootmenu', 'Báo Cáo Thống Kê', true, true, true, true, 'SYSTEM_INIT'),
(1, 'superadmin', 4, 'rootmenu', 'Tiện Ích & Cấu Hình', true, true, true, true, 'SYSTEM_INIT'),
(1, 'admin', 1, 'rootmenu', 'Hệ Thống', true, true, true, true, 'SYSTEM_INIT'),
(1, 'admin', 2, 'rootmenu', 'Sản Xuất', true, true, true, true, 'SYSTEM_INIT'),
(1, 'admin', 3, 'rootmenu', 'Báo Cáo Thống Kê', true, true, true, true, 'SYSTEM_INIT'),
(1, 'IT_TUANHV', 1, 'rootmenu', 'Hệ Thống', true, true, true, true, 'SYSTEM_INIT'),
(1, 'IT_TUANHV', 2, 'rootmenu', 'Sản Xuất', true, true, true, true, 'SYSTEM_INIT'),
(1, 'IT_TUANHV', 3, 'rootmenu', 'Báo Cáo Thống Kê', true, true, true, true, 'SYSTEM_INIT');

-- 12.6. Seed Cấu hình kết nối Bravo ERP
INSERT INTO "ErpConfig" (
    "ConfigKey", "ConfigName", "Provider", "AuthUrl", "BaseApiUrl", "Referer",
    "ClientId", "ClientSecret", "DeviceCode", "ConnectionName", "GrantType", "Scope", "InsecureSkipVerify"
) VALUES 
(
    'BravoDefault', 'Bravo ERP Goldsun (Default)', 'Bravo',
    'https://bravo.goldsunpackaging.vn:5051/fa837234b0b27bc02365a940995bdc24',
    'https://bravo.goldsunpackaging.vn:5051',
    'https://bravo.goldsunpackaging.vn:5052/',
    'c52bd596-07ff-4329-a640-67f41a51a90e',
    'DC86276E4BF54018BE9EC05650681914',
    '45fd8c9a3974fe45589811c5dfbc2fef',
    'Default', 'password', 'ApiGateway offline_access', true
)
ON CONFLICT ("ConfigKey") DO NOTHING;

-- 12.7. Seed Dynamic Endpoints
INSERT INTO "ErpEndpoint" (
    "EndpointKey", "ConfigKey", "Endpoint", "Stn", "San", "Alc", 
    "Ndcn", "Nocn", "Necn", "Nrcn", "Description"
) VALUES 
(
    'WorkDocCD_Master', 'BravoDefault', '4e9b7232116b4a4af1b990d81e00a049',
    'vB30WorkProcess_Explorer', 'Ct',
    'CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher',
    '_NoDelete_gim00a', '_NoOpen_esjp5f', '_NoEdit_tc393n', '_NoRecall_voxx2',
    'Truy vấn Master Lệnh Công Đoạn (Ct)'
),
(
    'WorkDocCD_Detail', 'BravoDefault', '4e9b7232116b4a4af1b990d81e00a049',
    'vB30WorkProcessDetail_Explorer', 'ChildTable_Detail',
    'CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher',
    '_NoDelete_in55v', '_NoOpen_osvfze', '_NoEdit_z1dhnu', '_NoRecall_a48pk',
    'Truy vấn Chi Tiết Lệnh Công Đoạn (ChildTable_Detail)'
),
(
    'WorkDocCD_Factory', 'BravoDefault', '7100966925033d94da5b1876d4f4582e',
    'vB30WorkProcess_Explorer', 'gr',
    'CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher',
    '_NoDelete_xmxz8m', '_NoOpen_bedh7t', '_NoEdit_8qcok', '_NoRecall_y2a9z',
    'Truy vấn Danh Mục Nhà Máy (gr)'
),
(
    'WorkDocCD_DetailTT', 'BravoDefault', '4e9b7232116b4a4af1b990d81e00a049',
    'vB30WorkProcessDetailTT', 'detailtt',
    'CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher',
    '_NoDelete_bggduv', '_NoOpen_gi177m', '_NoEdit_25en9', '_NoRecall_w1f9sb',
    'Truy vấn Chi Tiết Lệnh Thao Tác Quyết Toán (detailtt)'
)
ON CONFLICT ("EndpointKey") DO UPDATE SET
    "Endpoint" = EXCLUDED."Endpoint",
    "Stn" = EXCLUDED."Stn",
    "San" = EXCLUDED."San",
    "Alc" = EXCLUDED."Alc",
    "Ndcn" = EXCLUDED."Ndcn",
    "Nocn" = EXCLUDED."Nocn",
    "Necn" = EXCLUDED."Necn",
    "Nrcn" = EXCLUDED."Nrcn",
    "UpdatedAt" = CURRENT_TIMESTAMP;

-- =============================================================================
-- 13. BẢNG MASTER ĐĂNG KÝ BÁO CÁO (_ERPPlanMaster)
--     (Không dùng Foreign Key ràng buộc, định danh chuẩn UUIDv7 cho IdSeq và RegCode)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPPlanMaster" (
    "IdSeq"         VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "RegCode"       VARCHAR(100) NOT NULL UNIQUE,
    "ReportType"    VARCHAR(100) NOT NULL DEFAULT 'plan', -- 'plan' (KHSX) | 'statistics' (TKSX)
    "FactoryCode"   VARCHAR(50),            -- 'GS1' (Hà Nội) | 'GS5' (Quế Võ)
    "FactoryName"   VARCHAR(255),
    "ApplyDate"     VARCHAR(50),
    "Remark"        TEXT,
    "Status"        VARCHAR(50) DEFAULT 'published',
    "TotalRows"     INTEGER DEFAULT 0,
    "RowVersion"    BIGINT DEFAULT 1,
    "IsActive"      BOOLEAN DEFAULT true,
    "CreatedBy"     VARCHAR(100),            -- UserSeq / UserId người đăng ký
    "CreatedByName" VARCHAR(255),            -- Tên người đăng ký
    "CreatedAt"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"     VARCHAR(100),
    "UpdatedByName" VARCHAR(255),
    "UpdatedAt"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_planmaster_regcode" ON "_ERPPlanMaster" ("RegCode");
CREATE INDEX IF NOT EXISTS "idx_planmaster_reporttype" ON "_ERPPlanMaster" ("ReportType");
CREATE INDEX IF NOT EXISTS "idx_planmaster_factorycode" ON "_ERPPlanMaster" ("FactoryCode");
CREATE INDEX IF NOT EXISTS "idx_planmaster_applydate" ON "_ERPPlanMaster" ("ApplyDate");
CREATE INDEX IF NOT EXISTS "idx_planmaster_factoryname" ON "_ERPPlanMaster" ("FactoryName");
CREATE INDEX IF NOT EXISTS "idx_planmaster_createdby" ON "_ERPPlanMaster" ("CreatedBy");
CREATE INDEX IF NOT EXISTS "idx_planmaster_isactive" ON "_ERPPlanMaster" ("IsActive");
CREATE INDEX IF NOT EXISTS "idx_planmaster_createdat" ON "_ERPPlanMaster" ("CreatedAt" DESC);

-- =============================================================================
-- 14. BẢNG 1: CHI TIẾT DỮ LIỆU KẾ HOẠCH SẢN XUẤT ĐIỀU PHỐI (_ERPPlanDetail)
--     (Lưu trữ 24 cột dữ liệu KHSX, IdSeq & MasterSeq chuẩn UUIDv7, không dùng FK)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPPlanDetail" (
    "IdSeq"            VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "MasterSeq"        VARCHAR(36) NOT NULL,    -- UUIDv7 liên kết Master
    "RegCode"          TEXT NOT NULL,
    "RowSeq"           INTEGER DEFAULT 0,
    "WorkingTag"       VARCHAR(10) DEFAULT 'A',
    "PicDp"            TEXT,
    "OperationNo"      TEXT,
    "OpDate"           TEXT,
    "RoutingDocNo"     TEXT,
    "RoutingDocDate"   TEXT,
    "ItemCode"         TEXT,
    "ItemName"         TEXT,
    "OperationName"    TEXT,
    "OpTypeName"       TEXT,
    "MachineName"      TEXT,
    "Unit"             TEXT,
    "TargetPassQty"    TEXT,
    "TargetProdQty"    TEXT,
    "StatPassQty"      TEXT,
    "StartTime"        TEXT,
    "EndTime"          TEXT,
    "StandardProdTime" TEXT,
    "ActualProdTime"   TEXT,
    "StandardCapa"     TEXT,
    "ActualCapa"       TEXT,
    "StatusDpSx"       TEXT,
    "TimeStatus"       TEXT,
    "CapaStatus"       TEXT,
    "UserMemo"         TEXT,
    "RowVersion"       BIGINT DEFAULT 1,
    "IsActive"         BOOLEAN DEFAULT true,
    "CreatedBy"        TEXT,
    "CreatedByName"    TEXT,
    "CreatedAt"        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"        TEXT,
    "UpdatedByName"    TEXT,
    "UpdatedAt"        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_plandetail_masterseq" ON "_ERPPlanDetail" ("MasterSeq");
CREATE INDEX IF NOT EXISTS "idx_plandetail_regcode" ON "_ERPPlanDetail" ("RegCode");
CREATE INDEX IF NOT EXISTS "idx_plandetail_itemcode" ON "_ERPPlanDetail" ("ItemCode");
CREATE INDEX IF NOT EXISTS "idx_plandetail_machinename" ON "_ERPPlanDetail" ("MachineName");
CREATE INDEX IF NOT EXISTS "idx_plandetail_operationno" ON "_ERPPlanDetail" ("OperationNo");
CREATE INDEX IF NOT EXISTS "idx_plandetail_routingdocno" ON "_ERPPlanDetail" ("RoutingDocNo");
CREATE INDEX IF NOT EXISTS "idx_plandetail_opdate" ON "_ERPPlanDetail" ("OpDate");

-- =============================================================================
-- 15. BẢNG 2: CHI TIẾT DỮ LIỆU THỐNG KÊ SẢN XUẤT THỰC TẾ (_ERPProdStatsDetail)
--     (Lưu trữ toàn bộ cột dữ liệu TKSX, IdSeq & MasterSeq chuẩn UUIDv7, không dùng FK)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPProdStatsDetail" (
    "IdSeq"                  VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "MasterSeq"              VARCHAR(36) NOT NULL,    -- UUIDv7 liên kết Master
    "RegCode"                TEXT NOT NULL,
    "RowSeq"                 INTEGER DEFAULT 0,
    "WorkingTag"             VARCHAR(10) DEFAULT 'A',
    "ItemCode"               TEXT,
    "ItemName"               TEXT,
    "Version"                TEXT,
    "Model"                  TEXT,
    "DefectMarginWeight"     TEXT,
    "TechMarginWeight"       TEXT,
    "OperationNo"            TEXT,
    "MainWorker"             TEXT,
    "SubWorker1"             TEXT,
    "SubWorker2"             TEXT,
    "BreakdownReason"        TEXT,
    "MachineCode"            TEXT,
    "MachineName"            TEXT,
    "OpTypeCode"             TEXT,
    "OpTypeName"             TEXT,
    "UvPlate"                TEXT,
    "MoldSetQty1"            TEXT,
    "MoldSetQty2"            TEXT,
    "MoldSetQty3"            TEXT,
    "ProdQty"                TEXT,
    "PassQty"                TEXT,
    "ActualMeters"           TEXT,
    "StandardMeters"         TEXT,
    "TeamName"               TEXT,
    "Shift"                  TEXT,
    "StartDate"              TEXT,
    "StartTime"              TEXT,
    "EndDate"                TEXT,
    "EndTime"                TEXT,
    "StatDate"               TEXT,
    "StatTicketNo"           TEXT,
    "StatStaff"              TEXT,
    "Customer"               TEXT,
    "SalesStaff"             TEXT,
    "OrderNo"                TEXT,
    "ProcessName"            TEXT,
    "Unit"                   TEXT,
    "ConvUnit"               TEXT,
    "ProcessSpec"            TEXT,
    "PartNo"                 TEXT,
    "CorrugatedPartNo"       TEXT,
    "TrimPartNo"             TEXT,
    "ColorQty"               TEXT,
    "OutPlateType"           TEXT,
    "FrontColors"            TEXT,
    "BackColors"             TEXT,
    "JobNumber"              TEXT,
    "Width"                  TEXT,
    "Length"                 TEXT,
    "Height"                 TEXT,
    "ProductLine"            TEXT,
    "RawWidth"               TEXT,
    "RawLength"              TEXT,
    "RawLineCode"            TEXT,
    "RawLineName"            TEXT,
    "FlipType"               TEXT,
    "BomPlates"              TEXT,
    "Coating"                TEXT,
    "SlitterBlades"          TEXT,
    "CodePositions"          TEXT,
    "PunchHoles"             TEXT,
    "StructureCode"          TEXT,
    "StructureName"          TEXT,
    "RoutingDocNo"           TEXT,
    "RoutingDate"            TEXT,
    "ReleaseDate"            TEXT,
    "TargetPassQty"          TEXT,
    "TargetProdQty"          TEXT,
    "RoutingUnit"            TEXT,
    "BreakdownMinutes"       TEXT,
    "WaitingMaterialMinutes" TEXT,
    "SetupMinutes"           TEXT,
    "RepairMinutes"          TEXT,
    "TotalWasteMinutes"      TEXT,
    "RigidBoxGlue"           TEXT,
    "Outsourcing"            TEXT,
    "DefectQty"              TEXT,
    "DefectRate"             TEXT,
    "DefectUnit"             TEXT,
    "Status"                 TEXT,
    "AutoExport"             TEXT,
    "AutoImport"             TEXT,
    "ExportDocNo"            TEXT,
    "ImportDocNo"            TEXT,
    "WrongOpCode"            TEXT,
    "IsAdditionalStat"       TEXT,
    "TicketCreatedDate"      TEXT,
    "ActualRunTime"          TEXT,
    "ActualCapa"             TEXT,
    "CheckPlanStatus"        TEXT,
    "MesApprovalTime"        TEXT,
    "SyncDelayMinutes"       TEXT,
    "IsDuplicateTicket"      TEXT,
    "TicketCreationLocation" TEXT,
    "AutoIoStatus"           TEXT,
    "UserMemo"               TEXT,
    "RowVersion"             BIGINT DEFAULT 1,
    "IsActive"               BOOLEAN DEFAULT true,
    "CreatedBy"              TEXT,
    "CreatedByName"          TEXT,
    "CreatedAt"              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"              TEXT,
    "UpdatedByName"          TEXT,
    "UpdatedAt"              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_statsdetail_masterseq" ON "_ERPProdStatsDetail" ("MasterSeq");
CREATE INDEX IF NOT EXISTS "idx_statsdetail_regcode" ON "_ERPProdStatsDetail" ("RegCode");
CREATE INDEX IF NOT EXISTS "idx_statsdetail_itemcode" ON "_ERPProdStatsDetail" ("ItemCode");
CREATE INDEX IF NOT EXISTS "idx_statsdetail_machinename" ON "_ERPProdStatsDetail" ("MachineName");
CREATE INDEX IF NOT EXISTS "idx_statsdetail_operationno" ON "_ERPProdStatsDetail" ("OperationNo");
CREATE INDEX IF NOT EXISTS "idx_statsdetail_statticketno" ON "_ERPProdStatsDetail" ("StatTicketNo");
CREATE INDEX IF NOT EXISTS "idx_statsdetail_statdate" ON "_ERPProdStatsDetail" ("StatDate");


