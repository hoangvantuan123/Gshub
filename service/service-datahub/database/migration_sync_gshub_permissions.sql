-- =============================================================================
-- DATABASE: GsHub (PostgreSQL)
-- MODULE: ĐỒNG BỘ TOÀN DIỆN CẤU TRÚC PHÂN QUYỀN, MENU & ACTION THEO CHUẨN MẪU GSHUB
-- =============================================================================

BEGIN;

-- 1. Đảm bảo cấu trúc cột của bảng _ERPRolesUsers
ALTER TABLE "_ERPRolesUsers" ADD COLUMN IF NOT EXISTS "UserSeq" VARCHAR(36);
ALTER TABLE "_ERPRolesUsers" ADD COLUMN IF NOT EXISTS "IdxNo" INTEGER DEFAULT 1;
ALTER TABLE "_ERPRolesUsers" ADD COLUMN IF NOT EXISTS "Create" BOOLEAN DEFAULT false;
ALTER TABLE "_ERPRolesUsers" ADD COLUMN IF NOT EXISTS "Edit" BOOLEAN DEFAULT false;
ALTER TABLE "_ERPRolesUsers" ADD COLUMN IF NOT EXISTS "Delete" BOOLEAN DEFAULT false;
ALTER TABLE "_ERPRolesUsers" ADD COLUMN IF NOT EXISTS "Import" BOOLEAN DEFAULT false;
ALTER TABLE "_ERPRolesUsers" ADD COLUMN IF NOT EXISTS "Export" BOOLEAN DEFAULT false;

-- 2. ĐỒNG BỘ BẢNG PHÂN HỆ GỐC (_ERPRootMenus)
-- Xóa bỏ các ID cũ không đúng chuẩn nếu có
DELETE FROM "_ERPRootMenus" WHERE "Id" NOT IN (1, 2);

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
    "IdxNo" = EXCLUDED."IdxNo",
    "Utilities" = EXCLUDED."Utilities",
    "View" = EXCLUDED."View",
    "Create" = EXCLUDED."Create",
    "Edit" = EXCLUDED."Edit",
    "Delete" = EXCLUDED."Delete",
    "Import" = EXCLUDED."Import",
    "Export" = EXCLUDED."Export";

-- 3. ĐỒNG BỘ TOÀN BỘ CẤU TRÚC SUBMENU & MENU (_ERPMenus)
-- Xóa các menu rác ID 1..6 cũ không thuộc cấu trúc chuẩn
DELETE FROM "_ERPMenus" WHERE "Id" IN (1, 2, 3, 4, 5, 6);

INSERT INTO "_ERPMenus" (
    "Id", "Key", "MenuRootId", "MenuSubRootId", "Label", "Link", "Type", "Icon", "OrderSeq", "IdxNo",
    "View", "Create", "Edit", "Delete", "Import", "Export", "RowVersion"
)
VALUES
    -- ── 1. PHÂN HỆ BÁO CÁO (MenuRootId = 1) ──────────────────────────────────
    -- Nhóm 1: Báo cáo tổng hợp
    (100, 'report_consolidated_group', 1, NULL, 'Báo cáo tổng hợp', '', 'submenu', 'Folder', 1, 1, true, true, true, true, true, true, 1),
    (101, 'report_summary_plan', 1, 100, 'Tổng hợp kế hoạch sản xuất', '/erp/u/report/production/summary/plan', 'menu', 'Calendar', 1, 2, true, true, true, true, true, true, 1),
    (102, 'report_summary_stat', 1, 100, 'Tổng hợp thống kê sản xuất', '/erp/u/report/production/summary/statistics', 'menu', 'BarChart3', 2, 3, true, true, true, true, true, true, 1),

    -- Nhóm 2: Báo cáo sản xuất GS Hà Nội
    (200, 'report_prod_hanoi_gs1', 1, NULL, 'Báo cáo sản xuất GS Hà Nội', '', 'submenu', 'Building2', 2, 4, true, true, true, true, true, true, 1),
    (201, 'report_hanoi_gs1_plan', 1, 200, 'Kế hoạch sản xuất Hà Nội', '/erp/u/report/production/hanoi-gs1/plan', 'menu', 'Calendar', 1, 5, true, true, true, true, true, true, 1),
    (202, 'report_hanoi_gs1_stat', 1, 200, 'Thống kê sản xuất Hà Nội', '/erp/u/report/production/hanoi-gs1/statistics', 'menu', 'BarChart3', 2, 6, true, true, true, true, true, true, 1),

    -- Nhóm 3: Báo cáo sản xuất GS Quế Võ 1B
    (300, 'report_prod_quevo_gs5', 1, NULL, 'Báo cáo sản xuất GS Quế Võ 1B', '', 'submenu', 'Building2', 3, 7, true, true, true, true, true, true, 1),
    (301, 'report_quevo_gs5_plan', 1, 300, 'Kế hoạch sản xuất Quế Võ', '/erp/u/report/production/quevo-gs5/plan', 'menu', 'Calendar', 1, 8, true, true, true, true, true, true, 1),
    (302, 'report_quevo_gs5_stat', 1, 300, 'Thống kê sản xuất Quế Võ', '/erp/u/report/production/quevo-gs5/statistics', 'menu', 'BarChart3', 2, 9, true, true, true, true, true, true, 1),

    -- Nhóm 4: Đăng ký báo cáo
    (400, 'report_registration_group', 1, NULL, 'Đăng ký báo cáo', '', 'submenu', 'FileSpreadsheet', 4, 10, true, true, true, true, true, true, 1),
    (401, 'report_registration', 1, 400, 'Đăng ký báo cáo KHSX & TKSX', '/erp/u/report/registration', 'menu', 'FileSpreadsheet', 1, 11, true, true, true, true, true, true, 1),
    (402, 'report_plan_query', 1, 400, 'Truy vấn chi tiết KHSX', '/erp/u/report/plan-query', 'menu', 'Calendar', 2, 12, true, true, true, true, true, true, 1),
    (403, 'report_stat_query', 1, 400, 'Truy vấn chi tiết Thống kê SX', '/erp/u/report/stat-query', 'menu', 'BarChart3', 3, 13, true, true, true, true, true, true, 1),
    (404, 'report_calc_production_query', 1, 400, 'Tính KHSX & TKSX', '/erp/u/report/calc-production-query', 'menu', 'Calculator', 4, 14, true, true, true, true, true, true, 1),

    -- Nhóm 5: Cẩm nang & Tra cứu
    (600, 'report_handbook_group', 1, NULL, 'Cẩm nang & Tra cứu', '', 'submenu', 'BookOpen', 5, 15, true, true, true, true, true, true, 1),
    (601, 'report_handbook_formula', 1, 600, 'Tra cứu công thức & Cột dữ liệu', '/erp/u/report/handbook/formula', 'menu', 'BookOpen', 1, 16, true, true, true, true, true, true, 1),

    -- ── 2. PHÂN HỆ QUẢN TRỊ HỆ THỐNG (MenuRootId = 2) ────────────────────────
    -- Nhóm 1: Người dùng & Phân quyền
    (700, 'system_users_roles_group', 2, NULL, 'Người dùng & Phân quyền', '', 'submenu', 'ShieldAlert', 1, 17, true, true, true, true, true, true, 1),
    (701, 'system_users', 2, 700, 'Đăng ký Người dùng / Tài khoản', '/erp/u/system/users', 'menu', 'Users', 1, 18, true, true, true, true, true, true, 1),
    (702, 'system_role_groups', 2, 700, 'Đăng ký Nhóm phân quyền (Vai trò)', '/erp/u/system/role-groups', 'menu', 'Shield', 2, 19, true, true, true, true, true, true, 1),
    (703, 'system_permissions', 2, 700, 'Quản lý Phân quyền (Gắn User & Quyền)', '/erp/u/system/permissions', 'menu', 'ShieldCheck', 3, 20, true, true, true, true, true, true, 1),

    -- Nhóm 2: Cấu trúc Hệ thống & Menu
    (800, 'system_structure_group', 2, NULL, 'Cấu trúc Hệ thống & Menu', '', 'submenu', 'Network', 2, 21, true, true, true, true, true, true, 1),
    (801, 'system_root_modules', 2, 800, 'Đăng ký Module gốc (Phân hệ)', '/erp/u/system/modules', 'menu', 'FolderGit2', 1, 22, true, true, true, true, true, true, 1),
    (802, 'system_menus', 2, 800, 'Đăng ký Cấu trúc Submenu & Menu', '/erp/u/system/menus', 'menu', 'LayoutGrid', 2, 23, true, true, true, true, true, true, 1),
    (803, 'system_actions', 2, 800, 'Đăng ký Danh mục Hành động (Action)', '/erp/u/system/actions', 'menu', 'Zap', 3, 24, true, true, true, true, true, true, 1)
ON CONFLICT ("Id") DO UPDATE SET 
    "Key" = EXCLUDED."Key",
    "MenuRootId" = EXCLUDED."MenuRootId",
    "MenuSubRootId" = EXCLUDED."MenuSubRootId",
    "Label" = EXCLUDED."Label",
    "Link" = EXCLUDED."Link",
    "Type" = EXCLUDED."Type",
    "Icon" = EXCLUDED."Icon",
    "OrderSeq" = EXCLUDED."OrderSeq",
    "IdxNo" = EXCLUDED."IdxNo",
    "View" = EXCLUDED."View",
    "Create" = EXCLUDED."Create",
    "Edit" = EXCLUDED."Edit",
    "Delete" = EXCLUDED."Delete",
    "Import" = EXCLUDED."Import",
    "Export" = EXCLUDED."Export";

-- 4. ĐỒNG BỘ CÁC NHÓM VAI TRÒ / QUYỀN HẠN (_ERPGroups)
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

-- 5. ĐỒNG BỘ DANH MỤC HÀNH ĐỘNG / ACTION KEYS (_ERPActions)
INSERT INTO "_ERPActions" ("ActionKey", "ActionName", "Description", "Icon", "IdxNo", "Active")
VALUES
    ('BTN_SEARCH',  'Truy vấn dữ liệu (Search / F4)',      'Cho phép tìm kiếm và nạp danh sách dữ liệu',           'Search',      1, true),
    ('BTN_CREATE',  'Thêm mới bản ghi (Insert / F2)',      'Cho phép thêm mới dữ liệu',                            'Plus',        2, true),
    ('BTN_EDIT',    'Chỉnh sửa dữ liệu (Edit / Update)',   'Cho phép sửa thông tin bản ghi',                       'Edit3',       3, true),
    ('BTN_DELETE',  'Xóa bản ghi (Delete / F8)',           'Cho phép xóa dữ liệu đã chọn',                         'Trash2',      4, true),
    ('BTN_SAVE',    'Lưu thay đổi (Save / F10)',           'Cho phép lưu các bản ghi thêm/sửa',                    'Save',        5, true),
    ('BTN_PRINT',   'In biểu mẫu / Chứng từ (Print / F7)', 'Cho phép in tài liệu, biểu mẫu báo cáo',               'Printer',     6, true),
    ('BTN_EXPORT',  'Xuất file Excel / CSV (Export / F9)', 'Cho phép trích xuất dữ liệu ra bảng tính',             'Download',    7, true),
    ('BTN_IMPORT',  'Nhập file từ Excel (Import / F11)',   'Cho phép tải dữ liệu hàng loạt từ file Excel',         'Upload',      8, true),
    ('BTN_APPROVE', 'Phê duyệt / Ký số (Approve)',         'Quyền duyệt chứng từ hoặc chuyển bước quy trình',     'CheckCircle', 9, true),
    ('BTN_LOCK',    'Khóa dữ liệu / Chốt sổ (Lock)',       'Khóa dữ liệu không cho chỉnh sửa',                     'Lock',        10, true),
    -- Các ActionKey cơ bản tương thích ngược
    ('View',        'Xem dữ liệu',                          'Quyền truy cập và xem dữ liệu trên giao diện màn hình', 'Eye',         11, true),
    ('Create',      'Thêm mới',                             'Quyền tạo mới bản ghi dữ liệu',                         'Plus',        12, true),
    ('Edit',        'Chỉnh sửa',                            'Quyền cập nhật và lưu thay đổi bản ghi',                'Edit3',       13, true),
    ('Delete',      'Xóa',                                  'Quyền xóa bản ghi dữ liệu',                             'Trash2',      14, true),
    ('Import',      'Nhập file Excel',                      'Quyền import dữ liệu hàng loạt từ file Excel',          'Upload',      15, true),
    ('Export',      'Xuất file Excel',                      'Quyền kết xuất dữ liệu báo cáo ra file Excel',          'Download',    16, true)
ON CONFLICT ("ActionKey") DO UPDATE SET
    "ActionName"  = EXCLUDED."ActionName",
    "Description" = EXCLUDED."Description",
    "Icon"        = EXCLUDED."Icon",
    "IdxNo"       = EXCLUDED."IdxNo",
    "Active"      = EXCLUDED."Active";

-- 6. ĐỒNG BỘ BẢNG GÁN HÀNH ĐỘNG MENU (_ERPMenuActions)
TRUNCATE TABLE "_ERPMenuActions" RESTART IDENTITY;

-- Gán toàn bộ 10 Action chuẩn cho tất cả các menu loại 'menu'
INSERT INTO "_ERPMenuActions" ("MenuId", "ActionKey", "ActionName", "IdxNo")
SELECT 
    m."Id" AS "MenuId",
    a."ActionKey",
    a."ActionName",
    a."IdxNo"
FROM "_ERPMenus" m
CROSS JOIN "_ERPActions" a
WHERE m."Type" = 'menu' 
  AND a."ActionKey" IN (
      'BTN_SEARCH', 'BTN_CREATE', 'BTN_EDIT', 'BTN_DELETE', 'BTN_SAVE',
      'BTN_PRINT', 'BTN_EXPORT', 'BTN_IMPORT', 'BTN_APPROVE', 'BTN_LOCK'
  )
ORDER BY m."Id" ASC, a."IdxNo" ASC;

-- 7. ĐỒNG BỘ BẢNG HÀNH ĐỘNG QUYỀN HẠN (_ERPPermActions)
INSERT INTO "_ERPPermActions" ("IdSeq", "ActionCode", "ActionName", "LangKey", "IsDefaultAllow", "Comment", "IdxNo", "RowVersion")
VALUES
    ('01921345-6789-7abc-def0-323456789001', 'BTN_SEARCH',  'Truy vấn / Tìm kiếm dữ liệu (Search)', 'action.search',  true,  'Truy vấn và tìm kiếm dữ liệu trên lưới', 1, 1),
    ('01921345-6789-7abc-def0-323456789002', 'BTN_CREATE',  'Thêm mới dữ liệu (Create / Insert)',   'action.create',  true,  'Thêm mới chứng từ hoặc bản ghi',         2, 1),
    ('01921345-6789-7abc-def0-323456789003', 'BTN_SAVE',    'Lưu thay đổi dữ liệu (Save)',          'action.save',    true,  'Lưu các dòng dữ liệu thêm mới/sửa',      3, 1),
    ('01921345-6789-7abc-def0-323456789004', 'BTN_DELETE',  'Xóa dữ liệu / Dòng sheet (Delete)',    'action.delete',  false, 'Xóa bản ghi hoặc các dòng chọn',        4, 1),
    ('01921345-6789-7abc-def0-323456789005', 'BTN_PRINT',   'In ấn / Xem bản in (Print)',           'action.print',   true,  'In biểu mẫu chứng từ hoặc báo cáo',      5, 1),
    ('01921345-6789-7abc-def0-323456789006', 'BTN_EXPORT',  'Xuất dữ liệu Excel / CSV (Export)',    'action.export',  true,  'Kết xuất dữ liệu dạng bảng ra file',     6, 1),
    ('01921345-6789-7abc-def0-323456789007', 'BTN_IMPORT',  'Nhập dữ liệu từ Excel (Import)',       'action.import',  false, 'Nhập dữ liệu hàng loạt từ file Excel',   7, 1),
    ('01921345-6789-7abc-def0-323456789008', 'BTN_APPROVE', 'Phê duyệt / Ký số (Approve)',         'action.approve', false, 'Quyền duyệt chứng từ hoặc báo cáo',      8, 1),
    ('01921345-6789-7abc-def0-323456789009', 'BTN_LOCK',    'Khóa / Chốt dữ liệu (Lock)',           'action.lock',    false, 'Khóa dữ liệu không cho chỉnh sửa',       9, 1),
    ('01921345-6789-7abc-def0-323456789010', 'BTN_EDIT',    'Chỉnh sửa dữ liệu (Edit)',             'action.edit',    true,  'Chỉnh sửa dữ liệu trên lưới',            10, 1)
ON CONFLICT ("IdSeq") DO UPDATE SET
    "ActionCode" = EXCLUDED."ActionCode",
    "ActionName" = EXCLUDED."ActionName",
    "LangKey" = EXCLUDED."LangKey",
    "IsDefaultAllow" = EXCLUDED."IsDefaultAllow",
    "Comment" = EXCLUDED."Comment",
    "IdxNo" = EXCLUDED."IdxNo";

-- 8. CẬP NHẬT PHÂN QUYỀN MẪU CHO NHÓM SUPER ADMIN (_ERPRolesUsers)
-- Xóa phân quyền menu cũ của nhóm 1 để tái tạo chính xác
DELETE FROM "_ERPRolesUsers" WHERE "GroupId" = 1 AND "Type" IN ('rootmenu', 'menu');

INSERT INTO "_ERPRolesUsers" (
    "GroupId", "UserId", "UserSeq", "RootMenuId", "MenuId", "Type", "Name",
    "View", "Create", "Edit", "Delete", "Import", "Export", "CreatedBy", "RowVersion", "IdxNo"
)
VALUES
    -- Root menus
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, NULL, 'rootmenu', 'Báo Cáo Sản Xuất', true, true, true, true, true, true, 'SYSTEM', 1, 1),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 2, NULL, 'rootmenu', 'Quản Trị Hệ Thống', true, true, true, true, true, true, 'SYSTEM', 1, 2),
    -- Menus
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, 101, 'menu', 'Tổng hợp kế hoạch sản xuất', true, true, true, true, true, true, 'SYSTEM', 1, 1),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, 102, 'menu', 'Tổng hợp thống kê sản xuất', true, true, true, true, true, true, 'SYSTEM', 1, 2),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, 201, 'menu', 'Kế hoạch sản xuất Hà Nội', true, true, true, true, true, true, 'SYSTEM', 1, 3),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, 202, 'menu', 'Thống kê sản xuất Hà Nội', true, true, true, true, true, true, 'SYSTEM', 1, 4),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, 301, 'menu', 'Kế hoạch sản xuất Quế Võ', true, true, true, true, true, true, 'SYSTEM', 1, 5),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, 302, 'menu', 'Thống kê sản xuất Quế Võ', true, true, true, true, true, true, 'SYSTEM', 1, 6),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, 401, 'menu', 'Đăng ký báo cáo KHSX & TKSX', true, true, true, true, true, true, 'SYSTEM', 1, 7),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, 402, 'menu', 'Truy vấn chi tiết KHSX', true, true, true, true, true, true, 'SYSTEM', 1, 8),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, 403, 'menu', 'Truy vấn chi tiết Thống kê SX', true, true, true, true, true, true, 'SYSTEM', 1, 9),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, 404, 'menu', 'Tính KHSX & TKSX', true, true, true, true, true, true, 'SYSTEM', 1, 10),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 1, 601, 'menu', 'Tra cứu công thức & Cột dữ liệu', true, true, true, true, true, true, 'SYSTEM', 1, 11),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 2, 701, 'menu', 'Đăng ký Người dùng / Tài khoản', true, true, true, true, true, true, 'SYSTEM', 1, 12),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 2, 702, 'menu', 'Đăng ký Nhóm phân quyền (Vai trò)', true, true, true, true, true, true, 'SYSTEM', 1, 13),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 2, 703, 'menu', 'Quản lý Phân quyền (Gắn User & Quyền)', true, true, true, true, true, true, 'SYSTEM', 1, 14),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 2, 801, 'menu', 'Đăng ký Module gốc (Phân hệ)', true, true, true, true, true, true, 'SYSTEM', 1, 15),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 2, 802, 'menu', 'Đăng ký Cấu trúc Submenu & Menu', true, true, true, true, true, true, 'SYSTEM', 1, 16),
    (1, 'superadmin', (SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId" = 'superadmin' LIMIT 1), 2, 803, 'menu', 'Đăng ký Danh mục Hành động (Action)', true, true, true, true, true, true, 'SYSTEM', 1, 17);

-- Đảm bảo user superadmin có dòng gán vào nhóm 1
INSERT INTO "_ERPRolesUsers" ("GroupId", "UserId", "UserSeq", "Type", "View", "IdxNo", "CreatedBy")
SELECT 1, 'superadmin', u."UserSeq", 'user', true, 1, 'SYSTEM'
FROM "_ERPUsers" u
WHERE u."UserId" = 'superadmin'
  AND NOT EXISTS (
      SELECT 1 FROM "_ERPRolesUsers" 
      WHERE "GroupId" = 1 AND "Type" = 'user' AND "UserId" = 'superadmin'
  );

-- Đồng bộ sequence
SELECT setval(pg_get_serial_sequence('"_ERPRootMenus"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPRootMenus"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"_ERPMenus"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPMenus"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"_ERPGroups"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPGroups"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"_ERPRolesUsers"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPRolesUsers"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"_ERPActions"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPActions"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"_ERPMenuActions"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPMenuActions"), 0) + 1, false);

COMMIT;
