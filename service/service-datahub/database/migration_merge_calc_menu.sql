-- =============================================================================
-- MIGRATION: CẬP NHẬT SUBMENU ĐĂNG KÝ BÁO CÁO & MENU TRUY VẤN TÍNH KHSX - TKSX
-- DATABASE: DATAHUB / GSHUB (PostgreSQL)
-- =============================================================================

-- 1. Xóa các menu cũ nhóm 500 nếu có
DELETE FROM "_ERPRolesUsers" WHERE "MenuId" IN (500, 501, 502);
DELETE FROM "_ERPMenus" WHERE "Id" IN (500, 501, 502) OR "Key" IN ('report_calc_production_group', 'report_calc_production');

-- 2. Đảm bảo Submenu Đăng Ký Báo Cáo (Id = 400) tồn tại
INSERT INTO "_ERPMenus" (
    "Id", "Key", "MenuRootId", "MenuSubRootId", "Label", "Link", "Type", "Icon", "OrderSeq",
    "View", "Create", "Edit", "Delete", "Import", "Export", "RowVersion"
)
VALUES
    (400, 'report_registration_group', 1, NULL, 'Đăng ký báo cáo', '', 'submenu', 'FileSpreadsheet', 4, true, true, true, true, true, true, 1)
ON CONFLICT ("Id") DO UPDATE SET
    "Key" = EXCLUDED."Key",
    "Label" = EXCLUDED."Label",
    "Type" = EXCLUDED."Type",
    "Icon" = EXCLUDED."Icon",
    "OrderSeq" = EXCLUDED."OrderSeq",
    "View" = EXCLUDED."View";

-- 3. Upsert đầy đủ 4 Menu con trong Submenu Đăng Ký Báo Cáo (Id = 400)
INSERT INTO "_ERPMenus" (
    "Id", "Key", "MenuRootId", "MenuSubRootId", "Label", "Link", "Type", "Icon", "OrderSeq",
    "View", "Create", "Edit", "Delete", "Import", "Export", "RowVersion"
)
VALUES
    -- 1. Đăng ký biểu mẫu báo cáo KHSX & TKSX
    (401, 'report_registration', 1, 400, 'Đăng ký báo cáo KHSX & TKSX', '/erp/u/report/registration', 'menu', 'FileSpreadsheet', 1, true, true, true, true, true, true, 1),
    
    -- 2. Truy vấn chi tiết KHSX
    (402, 'report_plan_query', 1, 400, 'Truy vấn chi tiết KHSX', '/erp/u/report/plan-query', 'menu', 'Calendar', 2, true, true, true, true, true, true, 1),
    
    -- 3. Truy vấn chi tiết Thống kê SX (TKSX)
    (403, 'report_stat_query', 1, 400, 'Truy vấn chi tiết Thống kê SX', '/erp/u/report/stat-query', 'menu', 'BarChart3', 3, true, true, true, true, true, true, 1),
    
    -- 4. Tính KHSX & TKSX (Màn hình truy vấn master có nút hành động tính toán KHSX/TKSX mở new tab/window)
    (404, 'report_calc_production_query', 1, 400, 'Tính KHSX & TKSX', '/erp/u/report/calc-production-query', 'menu', 'Calculator', 4, true, true, true, true, true, true, 1)
ON CONFLICT ("Id") DO UPDATE SET
    "Key" = EXCLUDED."Key",
    "MenuSubRootId" = EXCLUDED."MenuSubRootId",
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

-- 4. Cập nhật thứ tự Submenu Cẩm nang & Tra cứu (Id = 600) thành OrderSeq = 5
UPDATE "_ERPMenus" 
SET "OrderSeq" = 5
WHERE "Id" = 600 OR "Key" = 'report_handbook_group';

-- 5. Cấp quyền View/Action cho tài khoản superadmin (nếu chưa có)
INSERT INTO "_ERPRolesUsers" (
    "GroupId", "UserId", "RootMenuId", "MenuId", "Type", "Name",
    "View", "Create", "Edit", "Delete", "Import", "Export", "CreatedBy", "RowVersion"
)
SELECT 1, 'superadmin', 1, 403, 'menu', 'Truy vấn chi tiết Thống kê SX', true, true, true, true, true, true, 'SYSTEM', 1
WHERE NOT EXISTS (
    SELECT 1 FROM "_ERPRolesUsers" WHERE "UserId" = 'superadmin' AND "MenuId" = 403
);

INSERT INTO "_ERPRolesUsers" (
    "GroupId", "UserId", "RootMenuId", "MenuId", "Type", "Name",
    "View", "Create", "Edit", "Delete", "Import", "Export", "CreatedBy", "RowVersion"
)
SELECT 1, 'superadmin', 1, 404, 'menu', 'Tính KHSX & TKSX', true, true, true, true, true, true, 'SYSTEM', 1
WHERE NOT EXISTS (
    SELECT 1 FROM "_ERPRolesUsers" WHERE "UserId" = 'superadmin' AND "MenuId" = 404
);

-- 6. Đồng bộ lại Serial Sequence
SELECT setval(pg_get_serial_sequence('"_ERPMenus"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPMenus"), 0) + 1, false);
