-- =============================================================================
-- MIGRATION: BẢNG ĐĂNG KÝ HÀNH ĐỘNG (ACTIONS) & LIÊN KẾT MENU ACTIONS
-- =============================================================================

BEGIN;

-- 1. BẢNG DANH MỤC HÀNH ĐỘNG / QUYỀN THAO TÁC (_ERPActions)
CREATE TABLE IF NOT EXISTS "_ERPActions" (
    "Id"          BIGSERIAL PRIMARY KEY,
    "ActionKey"   VARCHAR(50) NOT NULL UNIQUE,
    "ActionName"  VARCHAR(100) NOT NULL,
    "Description" TEXT,
    "Icon"        VARCHAR(50) DEFAULT 'Activity',
    "IdxNo"       INTEGER DEFAULT 1,
    "Active"      BOOLEAN DEFAULT true,
    "CreatedBy"   VARCHAR(100) DEFAULT 'SYSTEM',
    "CreatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"   VARCHAR(100) DEFAULT 'SYSTEM',
    "UpdatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "RowVersion"  BIGINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "idx_actions_key" ON "_ERPActions" ("ActionKey");
CREATE INDEX IF NOT EXISTS "idx_actions_active" ON "_ERPActions" ("Active");

-- 2. BẢNG GÁN HÀNH ĐỘNG ÁP DỤNG CHO TỪNG MENU (_ERPMenuActions)
CREATE TABLE IF NOT EXISTS "_ERPMenuActions" (
    "Id"          BIGSERIAL PRIMARY KEY,
    "MenuId"      BIGINT NOT NULL,
    "ActionKey"   VARCHAR(50) NOT NULL,
    "ActionName"  VARCHAR(100),
    "Active"      BOOLEAN DEFAULT true,
    "IdxNo"       INTEGER DEFAULT 1,
    "CreatedBy"   VARCHAR(100) DEFAULT 'SYSTEM',
    "CreatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "RowVersion"  BIGINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "idx_menu_actions_menuid" ON "_ERPMenuActions" ("MenuId");
CREATE INDEX IF NOT EXISTS "idx_menu_actions_actionkey" ON "_ERPMenuActions" ("ActionKey");

-- 3. SEED DỮ LIỆU CÁC ACTION MẪU CHUẨN ERP
INSERT INTO "_ERPActions" ("ActionKey", "ActionName", "Description", "Icon", "IdxNo", "Active")
VALUES
    ('View',    'Xem dữ liệu',       'Quyền truy cập và xem dữ liệu trên giao diện màn hình', 'Eye',         1, true),
    ('Create',  'Thêm mới',          'Quyền tạo mới bản ghi dữ liệu',                         'Plus',        2, true),
    ('Edit',    'Chỉnh sửa',         'Quyền cập nhật và lưu thay đổi bản ghi',                'Edit3',       3, true),
    ('Delete',  'Xóa',               'Quyền xóa bản ghi dữ liệu',                             'Trash2',      4, true),
    ('Import',  'Nhập file Excel',   'Quyền import dữ liệu hàng loạt từ file Excel',          'Upload',      5, true),
    ('Export',  'Xuất file Excel',   'Quyền kết xuất dữ liệu báo cáo ra file Excel',          'Download',    6, true),
    ('Print',   'In ấn & Xuất PDF',  'Quyền in biểu mẫu, tem nhãn và xuất tệp PDF',           'Printer',     7, true),
    ('Approve', 'Phê duyệt',         'Quyền phê duyệt lệnh, kế hoạch hoặc báo cáo sản xuất',  'CheckCircle', 8, true),
    ('Reject',  'Từ chối duyệt',     'Quyền từ chối hoặc trả về bản ghi',                     'XCircle',     9, true)
ON CONFLICT ("ActionKey") DO UPDATE SET
    "ActionName"  = EXCLUDED."ActionName",
    "Description" = EXCLUDED."Description",
    "Icon"        = EXCLUDED."Icon",
    "IdxNo"       = EXCLUDED."IdxNo",
    "Active"      = EXCLUDED."Active";

-- 4. SEED LIÊN KẾT MENU ACTIONS CHO CÁC MENU TRONG HỆ THỐNG
-- Xóa liên kết cũ để làm mới
TRUNCATE TABLE "_ERPMenuActions" RESTART IDENTITY;

-- Gán toàn bộ 6 quyền cơ bản (View, Create, Edit, Delete, Import, Export) cho tất cả các menu loại 'menu'
INSERT INTO "_ERPMenuActions" ("MenuId", "ActionKey", "ActionName", "IdxNo")
SELECT 
    m."Id" AS "MenuId",
    a."ActionKey",
    a."ActionName",
    a."IdxNo"
FROM "_ERPMenus" m
CROSS JOIN "_ERPActions" a
WHERE m."Type" = 'menu' AND a."ActionKey" IN ('View', 'Create', 'Edit', 'Delete', 'Import', 'Export')
ORDER BY m."Id" ASC, a."IdxNo" ASC;

-- Đồng bộ sequence
SELECT setval(pg_get_serial_sequence('"_ERPActions"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPActions"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"_ERPMenuActions"', 'Id'), COALESCE((SELECT MAX("Id") FROM "_ERPMenuActions"), 0) + 1, false);

COMMIT;
