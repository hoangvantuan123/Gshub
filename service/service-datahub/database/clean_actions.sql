BEGIN;

-- 1. Xóa toàn bộ các ActionKey rác không thuộc chuẩn BTN_* trong các bảng liên quan
DELETE FROM "_ERPRolesUsers" 
WHERE "Type" = 'action' 
  AND ("Name" IN ('View', 'Create', 'Edit', 'Delete', 'Import', 'Export', 'Print', 'Approve', 'Reject', 'view', 'create', 'edit', 'delete')
       OR "Name" NOT LIKE 'BTN_%');

DELETE FROM "_ERPMenuActions" 
WHERE "ActionKey" IN ('View', 'Create', 'Edit', 'Delete', 'Import', 'Export', 'Print', 'Approve', 'Reject')
   OR "ActionKey" NOT LIKE 'BTN_%';

DELETE FROM "_ERPActions" 
WHERE "ActionKey" IN ('View', 'Create', 'Edit', 'Delete', 'Import', 'Export', 'Print', 'Approve', 'Reject')
   OR "ActionKey" NOT LIKE 'BTN_%';

-- 2. Đảm bảo 10 Action chuẩn đã được đăng ký đầy đủ trong _ERPActions
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
    ('BTN_LOCK',    'Khóa dữ liệu / Chốt sổ (Lock)',       'Khóa dữ liệu không cho chỉnh sửa',                     'Lock',        10, true)
ON CONFLICT ("ActionKey") DO UPDATE SET
    "ActionName"  = EXCLUDED."ActionName",
    "Description" = EXCLUDED."Description",
    "Icon"        = EXCLUDED."Icon",
    "IdxNo"       = EXCLUDED."IdxNo",
    "Active"      = EXCLUDED."Active";

-- 3. Đảm bảo _ERPMenuActions chỉ gán 10 Action chuẩn cho các menu loại 'menu'
DELETE FROM "_ERPMenuActions";

INSERT INTO "_ERPMenuActions" ("MenuId", "ActionKey", "ActionName", "IdxNo")
SELECT 
    m."Id" AS "MenuId",
    a."ActionKey",
    a."ActionName",
    a."IdxNo"
FROM "_ERPMenus" m
CROSS JOIN "_ERPActions" a
WHERE m."Type" = 'menu' 
  AND a."ActionKey" LIKE 'BTN_%'
-- 4. Chuẩn hóa CreatedBy và UpdatedBy về đúng UserSeq (UUID) của User thay vì chuỗi text username
UPDATE "_ERPRolesUsers" r
SET "CreatedBy" = u."UserSeq"
FROM "_ERPUsers" u
WHERE (r."CreatedBy" = u."UserId" OR r."CreatedBy" = 'SYSTEM' OR r."CreatedBy" = 'superadmin')
  AND (u."UserId" = 'superadmin' OR u."UserName" = 'Administrator');

UPDATE "_ERPRolesUsers" r
SET "UpdatedBy" = u."UserSeq"
FROM "_ERPUsers" u
WHERE (r."UpdatedBy" = u."UserId" OR r."UpdatedBy" = 'SYSTEM' OR r."UpdatedBy" = 'superadmin')
  AND (u."UserId" = 'superadmin' OR u."UserName" = 'Administrator');

COMMIT;
