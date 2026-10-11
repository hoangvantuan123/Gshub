-- =============================================================================
-- DATABASE: DATAHUB (PostgreSQL)
-- MODULE: QUẢN TRỊ HỆ THỐNG & MA TRẬN PHÂN QUYỀN GSHUB
-- ĐẶC TÍNH: THIẾT KẾ ĐỘC LẬP CHUẨN ERP (KHÔNG DÙNG FOREIGN KEY, KHÔNG UNIQUE CẶP CỘT)
-- CÓ ĐẦY ĐỦ CÁC CỘT QUYỀN THAO TÁC: View, Create, Edit, Delete, Import, Export, RowVersion
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG TÀI KHOẢN NGƯỜI DÙNG (_ERPUsers)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_ERPUsers" (
    "UserSeq"            VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "CompanySeq"         INTEGER DEFAULT 1,
    "IdxNo"              INTEGER DEFAULT 1,
    "EmpID"              VARCHAR(50),
    "EmpCode"            VARCHAR(50),
    "EmpName"            VARCHAR(255),
    "DeptName"           VARCHAR(255),
    "ManagerName"        VARCHAR(255),
    "UserId"             VARCHAR(100) NOT NULL,
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
    "StatusAcc"          BOOLEAN DEFAULT false, -- false: hoạt động, true: bị khóa
    "Status"             VARCHAR(50) DEFAULT 'ACTIVE',
    "Active"             BOOLEAN DEFAULT true,
    "LanguageSeq"        INTEGER DEFAULT 6, -- 6 = Tiếng Việt
    "CreatedBy"          VARCHAR(36),
    "CreatedAt"          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"          VARCHAR(36),
    "UpdatedAt"          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "RowVersion"         BIGINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "idx_users_userid" ON "_ERPUsers" ("UserId");
CREATE INDEX IF NOT EXISTS "idx_users_empid" ON "_ERPUsers" ("EmpID");
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "_ERPUsers" ("Active");

-- -----------------------------------------------------------------------------
-- 2. BẢNG NHÓM PHÂN QUYỀN / VAI TRÒ (_ERPGroups)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_ERPGroups" (
    "Id"            BIGSERIAL PRIMARY KEY,
    "Name"          VARCHAR(255) NOT NULL,
    "Comment"       TEXT,
    "IdxNo"         INTEGER DEFAULT 1,
    "CreatedBy"     VARCHAR(100),
    "CreatedAt"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"     VARCHAR(100),
    "UpdatedAt"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "RowVersion"    BIGINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "idx_groups_idxno" ON "_ERPGroups" ("IdxNo" ASC);

-- -----------------------------------------------------------------------------
-- 3. BẢNG PHÂN QUYỀN GÁN USER & MENU (_ERPRolesUsers)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_ERPRolesUsers" (
    "Id"          BIGSERIAL PRIMARY KEY,
    "GroupId"     BIGINT,
    "UserId"      VARCHAR(100),
    "MenuId"      BIGINT,
    "RootMenuId"  BIGINT,
    "Type"        VARCHAR(50) DEFAULT 'menu', -- 'rootmenu', 'menu', 'action', 'user'
    "Name"        VARCHAR(255),
    "View"        BOOLEAN DEFAULT false,
    "CreatedBy"   VARCHAR(100),
    "CreatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"   VARCHAR(100),
    "UpdatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "RowVersion"  BIGINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "idx_roles_users_groupid" ON "_ERPRolesUsers" ("GroupId");
CREATE INDEX IF NOT EXISTS "idx_roles_users_userid" ON "_ERPRolesUsers" ("UserId");
CREATE INDEX IF NOT EXISTS "idx_roles_users_menuid" ON "_ERPRolesUsers" ("MenuId");

-- -----------------------------------------------------------------------------
-- 4. BẢNG ĐĂNG KÝ MODULE GỐC (_ERPRootMenus)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_ERPRootMenus" (
    "Id"          BIGSERIAL PRIMARY KEY,
    "Key"         VARCHAR(100) NOT NULL,
    "Label"       VARCHAR(255) NOT NULL,
    "Link"        VARCHAR(255) DEFAULT '',
    "Icon"        VARCHAR(100) DEFAULT 'AppWindow',
    "IdxNo"       INTEGER DEFAULT 1,
    "Utilities"   BOOLEAN DEFAULT true,
    "View"        BOOLEAN DEFAULT true,
    "CreatedBy"   VARCHAR(100),
    "CreatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"   VARCHAR(100),
    "UpdatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "RowVersion"  BIGINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "idx_root_menus_key" ON "_ERPRootMenus" ("Key");
CREATE INDEX IF NOT EXISTS "idx_root_menus_idxno" ON "_ERPRootMenus" ("IdxNo" ASC);

-- -----------------------------------------------------------------------------
-- 5. BẢNG ĐĂNG KÝ SUBMENU & MENU (_ERPMenus)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_ERPMenus" (
    "Id"            BIGSERIAL PRIMARY KEY,
    "Key"           VARCHAR(100) NOT NULL,
    "MenuSubRootId" BIGINT,
    "MenuRootId"    BIGINT NOT NULL,
    "Label"         VARCHAR(255) NOT NULL,
    "Link"          VARCHAR(255) DEFAULT '',
    "Type"          VARCHAR(50) DEFAULT 'menu', -- 'submenu', 'menu', 'menuitem'
    "Icon"          VARCHAR(100) DEFAULT 'FileText',
    "OrderSeq"      INTEGER DEFAULT 1,
    "DictSeq"       INTEGER DEFAULT 0,
    "IdxNo"         INTEGER DEFAULT 1,
    "View"          BOOLEAN DEFAULT true,
    "CreatedBy"     VARCHAR(100),
    "CreatedAt"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"     VARCHAR(100),
    "UpdatedAt"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "RowVersion"    BIGINT DEFAULT 1
);


CREATE INDEX IF NOT EXISTS "idx_menus_key" ON "_ERPMenus" ("Key");
CREATE INDEX IF NOT EXISTS "idx_menus_rootid" ON "_ERPMenus" ("MenuRootId");
CREATE INDEX IF NOT EXISTS "idx_menus_subrootid" ON "_ERPMenus" ("MenuSubRootId");
CREATE INDEX IF NOT EXISTS "idx_menus_type" ON "_ERPMenus" ("Type");

-- -----------------------------------------------------------------------------
-- 6. BẢNG NHẬT KÝ ĐĂNG NHẬP (_ERPLoginLogs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_ERPLoginLogs" (
    "Id"         BIGSERIAL PRIMARY KEY,
    "UserId"     VARCHAR(100) NOT NULL,
    "UserSeq"    VARCHAR(36),
    "Status"     VARCHAR(50),
    "IpAddress"  VARCHAR(50),
    "UserAgent"  VARCHAR(500),
    "DeviceInfo" TEXT,
    "CreatedAt"  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_login_logs_userid" ON "_ERPLoginLogs" ("UserId");


-- =============================================================================
-- CÁC CÂU LỆNH INSERT DỮ LIỆU MẪU (SEED DATA CHUẨN CÂY MENU GSHUB)
-- =============================================================================

-- A. Dữ liệu mẫu 2 Phân hệ Gốc (_ERPRootMenus)
INSERT INTO "_ERPRootMenus" (
    "Id", "Key", "Label", "Link", "Icon", "IdxNo", "Utilities",
    "View", "Create", "Edit", "Delete", "Import", "Export", "RowVersion"
)
VALUES 
    (1, 'ROOT_REPORT', 'Báo Cáo Sản Xuất', '/erp/u/report', 'BarChart3', 1, true, true, true, true, true, true, true, 1),
    (2, 'ROOT_SYSTEM', 'Quản Trị Hệ Thống', '/erp/u/system', 'Settings', 2, true, true, true, true, true, true, true, 1)
ON CONFLICT ("Id") DO UPDATE SET 
    "Key" = EXCLUDED."Key",
    "Label" = EXCLUDED."Label",
    "Link" = EXCLUDED."Link",
    "Icon" = EXCLUDED."Icon",
    "View" = EXCLUDED."View",
    "Create" = EXCLUDED."Create",
    "Edit" = EXCLUDED."Edit",
    "Delete" = EXCLUDED."Delete",
    "Import" = EXCLUDED."Import",
    "Export" = EXCLUDED."Export";

-- B. Dữ liệu mẫu toàn bộ Submenu & Menu theo đúng cây cấu trúc GSHub (_ERPMenus)
INSERT INTO "_ERPMenus" (
    "Id", "Key", "MenuRootId", "MenuSubRootId", "Label", "Link", "Type", "Icon", "OrderSeq",
    "View", "Create", "Edit", "Delete", "Import", "Export", "RowVersion"
)
VALUES
    -- ── 1. PHÂN HỆ BÁO CÁO (MenuRootId = 1) ──────────────────────────────────
    -- Nhóm 1: Báo cáo tổng hợp
    (100, 'report_consolidated_group', 1, NULL, 'Báo cáo tổng hợp', '', 'submenu', 'Folder', 1, true, true, true, true, true, true, 1),
    (101, 'report_summary_plan', 1, 100, 'Tổng hợp kế hoạch sản xuất', '/erp/u/report/production/summary/plan', 'menu', 'Calendar', 1, true, true, true, true, true, true, 1),
    (102, 'report_summary_stat', 1, 100, 'Tổng hợp thống kê sản xuất', '/erp/u/report/production/summary/statistics', 'menu', 'BarChart3', 2, true, true, true, true, true, true, 1),

    -- Nhóm 2: Báo cáo sản xuất GS Hà Nội
    (200, 'report_prod_hanoi_gs1', 1, NULL, 'Báo cáo sản xuất GS Hà Nội', '', 'submenu', 'Building2', 2, true, true, true, true, true, true, 1),
    (201, 'report_hanoi_gs1_plan', 1, 200, 'Kế hoạch sản xuất Hà Nội', '/erp/u/report/production/hanoi-gs1/plan', 'menu', 'Calendar', 1, true, true, true, true, true, true, 1),
    (202, 'report_hanoi_gs1_stat', 1, 200, 'Thống kê sản xuất Hà Nội', '/erp/u/report/production/hanoi-gs1/statistics', 'menu', 'BarChart3', 2, true, true, true, true, true, true, 1),

    -- Nhóm 3: Báo cáo sản xuất GS Quế Võ 1B
    (300, 'report_prod_quevo_gs5', 1, NULL, 'Báo cáo sản xuất GS Quế Võ 1B', '', 'submenu', 'Building2', 3, true, true, true, true, true, true, 1),
    (301, 'report_quevo_gs5_plan', 1, 300, 'Kế hoạch sản xuất Quế Võ', '/erp/u/report/production/quevo-gs5/plan', 'menu', 'Calendar', 1, true, true, true, true, true, true, 1),
    (302, 'report_quevo_gs5_stat', 1, 300, 'Thống kê sản xuất Quế Võ', '/erp/u/report/production/quevo-gs5/statistics', 'menu', 'BarChart3', 2, true, true, true, true, true, true, 1),

    -- Nhóm 4: Đăng ký báo cáo
    (400, 'report_registration_group', 1, NULL, 'Đăng ký báo cáo', '', 'submenu', 'FileSpreadsheet', 4, true, true, true, true, true, true, 1),
    (401, 'report_registration', 1, 400, 'Đăng ký báo cáo KHSX & TKSX', '/erp/u/report/registration', 'menu', 'FileSpreadsheet', 1, true, true, true, true, true, true, 1),
    (402, 'report_plan_query', 1, 400, 'Truy vấn chi tiết KHSX', '/erp/u/report/plan-query', 'menu', 'Calendar', 2, true, true, true, true, true, true, 1),
    (403, 'report_stat_query', 1, 400, 'Truy vấn chi tiết Thống kê SX', '/erp/u/report/stat-query', 'menu', 'BarChart3', 3, true, true, true, true, true, true, 1),
    (404, 'report_calc_production_query', 1, 400, 'Tính KHSX & TKSX', '/erp/u/report/calc-production-query', 'menu', 'Calculator', 4, true, true, true, true, true, true, 1),

    -- Nhóm 5: Cẩm nang & Tra cứu
    (600, 'report_handbook_group', 1, NULL, 'Cẩm nang & Tra cứu', '', 'submenu', 'BookOpen', 5, true, true, true, true, true, true, 1),
    (601, 'report_handbook_formula', 1, 600, 'Tra cứu công thức & Cột dữ liệu', '/erp/u/report/handbook/formula', 'menu', 'BookOpen', 1, true, true, true, true, true, true, 1),

    -- ── 2. PHÂN HỆ QUẢN TRỊ HỆ THỐNG (MenuRootId = 2) ────────────────────────
    -- Nhóm 1: Người dùng & Phân quyền
    (700, 'system_users_roles_group', 2, NULL, 'Người dùng & Phân quyền', '', 'submenu', 'ShieldAlert', 1, true, true, true, true, true, true, 1),
    (701, 'system_users', 2, 700, 'Đăng ký Người dùng / Tài khoản', '/erp/u/system/users', 'menu', 'Users', 1, true, true, true, true, true, true, 1),
    (702, 'system_role_groups', 2, 700, 'Đăng ký Nhóm phân quyền (Vai trò)', '/erp/u/system/role-groups', 'menu', 'Shield', 2, true, true, true, true, true, true, 1),
    (703, 'system_permissions', 2, 700, 'Quản lý Phân quyền (Gắn User & Quyền)', '/erp/u/system/permissions', 'menu', 'ShieldCheck', 3, true, true, true, true, true, true, 1),

    -- Nhóm 2: Cấu trúc Hệ thống & Menu
    (800, 'system_structure_group', 2, NULL, 'Cấu trúc Hệ thống & Menu', '', 'submenu', 'Network', 2, true, true, true, true, true, true, 1),
    (801, 'system_root_modules', 2, 800, 'Đăng ký Module gốc (Phân hệ)', '/erp/u/system/modules', 'menu', 'FolderGit2', 1, true, true, true, true, true, true, 1),
    (802, 'system_menus', 2, 800, 'Đăng ký Cấu trúc Submenu & Menu', '/erp/u/system/menus', 'menu', 'LayoutGrid', 2, true, true, true, true, true, true, 1)
ON CONFLICT ("Id") DO UPDATE SET 
    "Key" = EXCLUDED."Key",
    "Label" = EXCLUDED."Label",
    "Link" = EXCLUDED."Link",
    "Type" = EXCLUDED."Type",
    "Icon" = EXCLUDED."Icon",
    "OrderSeq" = EXCLUDED."OrderSeq",
    "View" = EXCLUDED."View",
    "Create" = EXCLUDED."Create",
    "Edit" = EXCLUDED."Edit",
    "Delete" = EXCLUDED."Delete",
    "Import" = EXCLUDED."Import",
    "Export" = EXCLUDED."Export";

-- C. Dữ liệu mẫu các Nhóm phân quyền / Vai trò (_ERPGroups)
INSERT INTO "_ERPGroups" ("Id", "Name", "Comment", "IdxNo", "CreatedBy", "RowVersion")
VALUES
    (1, 'Super Administrators', 'Toàn quyền cấu hình & quản trị hệ thống GSHub', 1, 'SYSTEM', 1),
    (2, 'Ban Giám Đốc', 'Xem toàn bộ báo cáo sản xuất và phân tích điều hành', 2, 'SYSTEM', 1),
    (3, 'Quản Đốc Nhà Máy GS Hà Nội', 'Quản lý báo cáo kế hoạch và thống kê nhà máy GS Hà Nội', 3, 'SYSTEM', 1),
    (4, 'Quản Đốc Nhà Máy GS Quế Võ', 'Quản lý báo cáo kế hoạch và thống kê nhà máy GS Quế Võ 1B', 4, 'SYSTEM', 1),
    (5, 'Chuyên Viên Kế Hoạch Sản Xuất', 'Lập kế hoạch sản xuất, tính toán và đăng ký báo cáo', 5, 'SYSTEM', 1),
    (6, 'Chuyên Viên Thống Kê Sản Xuất', 'Cập nhật thống kê sản lượng và tra cứu công thức', 6, 'SYSTEM', 1)
ON CONFLICT ("Id") DO UPDATE SET 
    "Name" = EXCLUDED."Name",
    "Comment" = EXCLUDED."Comment",
    "IdxNo" = EXCLUDED."IdxNo";

-- D. Dữ liệu mẫu Phân quyền chi tiết cho nhóm Super Admin (_ERPRolesUsers)
INSERT INTO "_ERPRolesUsers" (
    "GroupId", "UserId", "RootMenuId", "MenuId", "Type", "Name",
    "View", "Create", "Edit", "Delete", "Import", "Export", "CreatedBy", "RowVersion"
)
VALUES
    (1, 'superadmin', 1, NULL, 'rootmenu', 'Báo Cáo Sản Xuất', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 2, NULL, 'rootmenu', 'Quản Trị Hệ Thống', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 1, 101, 'menu', 'Tổng hợp kế hoạch sản xuất', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 1, 102, 'menu', 'Tổng hợp thống kê sản xuất', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 1, 201, 'menu', 'Kế hoạch sản xuất Hà Nội', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 1, 202, 'menu', 'Thống kê sản xuất Hà Nội', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 1, 301, 'menu', 'Kế hoạch sản xuất Quế Võ', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 1, 302, 'menu', 'Thống kê sản xuất Quế Võ', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 1, 401, 'menu', 'Đăng ký báo cáo KHSX & TKSX', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 2, 701, 'menu', 'Đăng ký Người dùng / Tài khoản', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 2, 702, 'menu', 'Đăng ký Nhóm phân quyền (Vai trò)', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 2, 703, 'menu', 'Quản lý Phân quyền (Gắn User & Quyền)', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 2, 801, 'menu', 'Đăng ký Module gốc (Phân hệ)', true, true, true, true, true, true, 'SYSTEM', 1),
    (1, 'superadmin', 2, 802, 'menu', 'Đăng ký Cấu trúc Submenu & Menu', true, true, true, true, true, true, 'SYSTEM', 1);

-- Đồng bộ lại Serial Sequence của các bảng
SELECT setval(pg_get_serial_sequence('"_ERPRootMenus"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPRootMenus"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"_ERPMenus"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPMenus"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"_ERPGroups"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPGroups"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"_ERPRolesUsers"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPRolesUsers"), 0) + 1, false);
