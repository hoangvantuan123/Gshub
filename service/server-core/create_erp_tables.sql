-- =============================================================================
-- FILE SQL TẠO TOÀN BỘ CƠ SỞ DỮ LIỆU CHÍNH HỆ THỐNG: DATABASE `ERP`
-- =============================================================================
-- Hướng dẫn: Mở DBeaver / pgAdmin / psql kết nối tới Database `ERP` và chạy file này.
-- Không cần chạy AutoMigrate trên server backend.
-- =============================================================================

-- =============================================================================
-- 1. BẢNG TÀI KHOẢN NGƯỜI DÙNG (_ERPUsers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPUsers" (
    "UserSeq"            VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "CompanySeq"         INTEGER,
    "IdxNo"              INTEGER,
    "EmpID"              VARCHAR(50),
    "EmpCode"            VARCHAR(50),
    "EmpName"            VARCHAR(255),
    "DeptName"           VARCHAR(255),
    "ManagerName"        VARCHAR(255),
    "UserId"             VARCHAR(100),
    "UserType"           INTEGER,
    "UserName"           VARCHAR(255),
    "EmpSeq"             INTEGER,
    "LoginPwd"           TEXT,
    "Password1"          TEXT,
    "Password2"          TEXT,
    "Password3"          TEXT,
    "LoginStatus"        INTEGER,
    "LoginDate"          VARCHAR(50),
    "PwdChgDate"         VARCHAR(50),
    "PassHis"            TEXT,
    "Email"              VARCHAR(255),
    "IsOtpVerified"      BOOLEAN DEFAULT false,
    "IsEmailVerified"    BOOLEAN DEFAULT false,
    "LoginFailCnt"       INTEGER DEFAULT 0,
    "PwdType"            VARCHAR(50),
    "LoginType"          INTEGER,
    "ManagementType"     INTEGER,
    "LastUserSeq"        VARCHAR(36),
    "LastDateTime"       TIMESTAMPTZ,
    "Dsn"                VARCHAR(255),
    "Remark"             TEXT,
    "UserlimitDate"      VARCHAR(50),
    "LoginFailFirstTime" TIMESTAMPTZ,
    "IsLayoutAdmin"      INTEGER,
    "IsGroupWareUser"    VARCHAR(10),
    "SMUserType"         INTEGER,
    "LicenseType"        INTEGER,
    "CheckPass1"         BOOLEAN DEFAULT false,
    "StatusAcc"          BOOLEAN DEFAULT false,
    "Status"             VARCHAR(50),
    "Active"             BOOLEAN DEFAULT true,
    "LanguageSeq"        INTEGER DEFAULT 1,
    "CreatedBy"          VARCHAR(36),
    "CreatedAt"          TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"          VARCHAR(36),
    "UpdatedAt"          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_userid" ON "_ERPUsers" ("UserId");
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "_ERPUsers" ("Active");
CREATE INDEX IF NOT EXISTS "idx_users_idxno" ON "_ERPUsers" ("IdxNo" ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS "idx_users_createdby" ON "_ERPUsers" ("CreatedBy");
CREATE INDEX IF NOT EXISTS "idx_users_updatedby" ON "_ERPUsers" ("UpdatedBy");
CREATE INDEX IF NOT EXISTS "idx_users_username" ON "_ERPUsers" ("UserName");


-- =============================================================================
-- 2. BẢNG CHI TIẾT NHÂN VIÊN (_ERPUserDetails)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPUserDetails" (
    "IdSeq"         BIGSERIAL PRIMARY KEY,
    "UserSeq"       VARCHAR(36),
    "PartSeq"       INTEGER,
    "ProdDepartSeq" INTEGER,
    "PositionSeq"   INTEGER,
    "CanScanQR"     BOOLEAN DEFAULT false,
    "IsActive"      BOOLEAN DEFAULT true,
    "IdxNo"         INTEGER,
    "CreatedBy"     VARCHAR(36),
    "CreatedAt"     TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"     VARCHAR(36),
    "UpdatedAt"     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_userdetails_userseq" ON "_ERPUserDetails" ("UserSeq");


-- =============================================================================
-- 3. BẢNG ROOT MENU - MENU GỐC (_ERPRootMenus)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPRootMenus" (
    "Id"          BIGSERIAL PRIMARY KEY,
    "Key"         VARCHAR(100),
    "IdxNo"       INTEGER,
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
-- 4. BẢNG MENUS - MENU CON & SUBMENU (_ERPMenus)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPMenus" (
    "Id"            BIGSERIAL PRIMARY KEY,
    "MenuRootId"    INTEGER,
    "MenuSubRootId" INTEGER,
    "Key"           VARCHAR(100),
    "Label"         VARCHAR(255),
    "Link"          VARCHAR(255),
    "Type"          VARCHAR(50),
    "OrderSeq"      INTEGER,
    "DictSeq"       INTEGER,
    "IdxNo"         INTEGER,
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
-- 5. BẢNG NHÓM NGƯỜI DÙNG (_ERPGroups)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPGroups" (
    "Id"          BIGSERIAL PRIMARY KEY,
    "Name"        VARCHAR(255),
    "Comment"     TEXT,
    "IdxNo"       INTEGER,
    "RowVersion"  BIGINT DEFAULT 1,
    "CreatedBy"   VARCHAR(100),
    "CreatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"   VARCHAR(100),
    "UpdatedAt"   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_groups_name" ON "_ERPGroups" ("Name");
CREATE INDEX IF NOT EXISTS "idx_groups_idxno" ON "_ERPGroups" ("IdxNo" ASC NULLS LAST);


-- =============================================================================
-- 6. BẢNG PHÂN QUYỀN VAI TRÒ / MENU (_ERPRolesUsers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPRolesUsers" (
    "Id"         BIGSERIAL PRIMARY KEY,
    "View"       BOOLEAN DEFAULT false,
    "IdxNo"      INTEGER,
    "Edit"       BOOLEAN DEFAULT false,
    "Create"     BOOLEAN DEFAULT false,
    "Delete"     BOOLEAN DEFAULT false,
    "RootMenuId" INTEGER,
    "MenuId"     INTEGER,
    "GroupId"    INTEGER,
    "UserId"     VARCHAR(100),
    "UserSeq"    VARCHAR(36),
    "Type"       VARCHAR(50),
    "Name"       VARCHAR(255),
    "CreatedBy"  VARCHAR(36),
    "CreatedAt"  TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"  VARCHAR(36),
    "UpdatedAt"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_roles_users_userid" ON "_ERPRolesUsers" ("UserId");
CREATE INDEX IF NOT EXISTS "idx_roles_users_menuid" ON "_ERPRolesUsers" ("MenuId");
CREATE INDEX IF NOT EXISTS "idx_roles_users_groupid" ON "_ERPRolesUsers" ("GroupId");
CREATE INDEX IF NOT EXISTS "idx_roles_users_userseq" ON "_ERPRolesUsers" ("UserSeq");


-- =============================================================================
-- 7. BẢNG NGÔN NGỮ (_ERPLanguage)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPLanguage" (
    "LanguageSeq"  SERIAL PRIMARY KEY,
    "LanguageCode" VARCHAR(50),
    "LanguageName" VARCHAR(255),
    "Remark"       TEXT,
    "IdxNo"        INTEGER,
    "CreatedBy"    VARCHAR(36),
    "CreatedAt"    TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"    VARCHAR(36),
    "UpdatedAt"    TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- 8. BẢNG TỪ ĐIỂN ĐA NGÔN NGỮ (_ERPDictionary)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPDictionary" (
    "IdSeq"        BIGSERIAL PRIMARY KEY,
    "WordSeq"      INTEGER,
    "LanguageSeq"  INTEGER,
    "Word"         TEXT,
    "IdxNo"        INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_dict_languageseq" ON "_ERPDictionary" ("LanguageSeq");
CREATE INDEX IF NOT EXISTS "idx_dict_wordseq" ON "_ERPDictionary" ("WordSeq");


-- =============================================================================
-- 9. BẢNG PHIÊN BẢN TỪ ĐIỂN (_ERPDictVer)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPDictVer" (
    "LanguageSeq"  INTEGER PRIMARY KEY,
    "LanguageCode" VARCHAR(20) NOT NULL UNIQUE,
    "VersionHash"  VARCHAR(128) NOT NULL,
    "UpdatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_erp_dict_ver_language_code" ON "_ERPDictVer" ("LanguageCode");





-- =============================================================================
-- 18. BẢNG ĐĂNG KÝ HÀNH ĐỘNG QUYỀN HẠN (_ERPPermActions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPPermActions" (
    "IdSeq"          VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "ActionCode"     VARCHAR(100),
    "ActionName"     VARCHAR(255),
    "LangKey"        VARCHAR(100),
    "IsDefaultAllow" BOOLEAN DEFAULT false,
    "Comment"        TEXT,
    "RowVersion"     BIGINT DEFAULT 1,
    "IdxNo"          INTEGER,
    "CreatedBy"      VARCHAR(36),
    "CreatedAt"      TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"      VARCHAR(36),
    "UpdatedAt"      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_permactions_actioncode" ON "_ERPPermActions" ("ActionCode");
CREATE INDEX IF NOT EXISTS "idx_permactions_idxno" ON "_ERPPermActions" ("IdxNo" ASC NULLS LAST);


-- =============================================================================
-- 19. BẢNG ĐĂNG KÝ NHÓM THUỘC TÍNH HỆ THỐNG (_ERPSysAttrGroups)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPSysAttrGroups" (
    "IdSeq"          VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "GroupCode"      VARCHAR(100) NOT NULL,   -- SCOPE_LEVEL, RULE_CONDITION, FIELD_TYPE... (Giá trị duy nhất)
    "GroupName"      VARCHAR(255),
    "CodeHelp"       BIGINT NOT NULL,
    "LangKey"        VARCHAR(100),
    "Comment"        TEXT,
    "RowVersion"     BIGINT DEFAULT 1,
    "IdxNo"          INTEGER,
    "CreatedBy"      VARCHAR(36),
    "CreatedAt"      TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"      VARCHAR(36),
    "UpdatedAt"      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_sysattrgroups_groupcode" ON "_ERPSysAttrGroups" ("GroupCode");
CREATE INDEX IF NOT EXISTS "idx_sysattrgroups_idxno" ON "_ERPSysAttrGroups" ("IdxNo" ASC NULLS LAST);


-- =============================================================================
-- 20. BẢNG ĐĂNG KÝ CHI TIẾT GIÁ TRỊ THUỘC TÍNH (_ERPSysAttrItems)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPSysAttrItems" (
    "IdSeq"          VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "AttrGroupSeq"   VARCHAR(36),             -- Lưu IdSeq bảng _ERPSysAttrGroups
    "AttrValueCode"  VARCHAR(100) NOT NULL,   -- ALL, BRANCH, DEPT, SELF, ALL_STATUS, DRAFT_ONLY... (Giá trị duy nhất)
    "AttrValueName"  VARCHAR(255),            -- Toàn hệ thống (ALL), Chỉ bản nháp...
    "LangKey"        VARCHAR(100),
    "ExtraValue"     TEXT,                    -- Giá trị cấu hình thêm / SQL template (1=1, Status = 0...)
    "Comment"        TEXT,
    "IsActive"       BOOLEAN NOT NULL DEFAULT TRUE,
    "RowVersion"     BIGINT DEFAULT 1,
    "IdxNo"          INTEGER,
    "CreatedBy"      VARCHAR(36),
    "CreatedAt"      TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"      VARCHAR(36),
    "UpdatedAt"      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_sysattritems_groupseq" ON "_ERPSysAttrItems" ("AttrGroupSeq");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sysattritems_attrvaluecode" ON "_ERPSysAttrItems" ("AttrValueCode");
CREATE INDEX IF NOT EXISTS "idx_sysattritems_idxno" ON "_ERPSysAttrItems" ("IdxNo" ASC NULLS LAST);


-- =============================================================================
-- 21. BẢNG ĐĂNG KÝ PHẠM VI DỮ LIỆU (_ERPPermScopes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPPermScopes" (
    "IdSeq"             VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "ScopeCode"         VARCHAR(100),
    "ScopeName"         VARCHAR(255),
    "LangKey"           VARCHAR(100),
    "PermActionSeq"     VARCHAR(36),             -- Lưu IdSeq bảng _ERPPermActions
    "ScopeLevelSeq"     VARCHAR(36),             -- Lưu IdSeq bảng _ERPSysAttrItems (Group: SCOPE_LEVEL)
    "RuleConditionSeq"  VARCHAR(36),             -- Lưu IdSeq bảng _ERPSysAttrItems (Group: RULE_CONDITION)
    "ConditionSql"      TEXT,                    -- WHERE SQL điều kiện lọc thực tế
    "Comment"           TEXT,
    "RowVersion"        BIGINT DEFAULT 1,
    "IdxNo"             INTEGER,
    "CreatedBy"         VARCHAR(36),
    "CreatedAt"         TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"         VARCHAR(36),
    "UpdatedAt"         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_permscopes_scopecode" ON "_ERPPermScopes" ("ScopeCode");
CREATE INDEX IF NOT EXISTS "idx_permscopes_permactionseq" ON "_ERPPermScopes" ("PermActionSeq");
CREATE INDEX IF NOT EXISTS "idx_permscopes_scopelevelseq" ON "_ERPPermScopes" ("ScopeLevelSeq");
CREATE INDEX IF NOT EXISTS "idx_permscopes_rulecondseq" ON "_ERPPermScopes" ("RuleConditionSeq");
CREATE INDEX IF NOT EXISTS "idx_permscopes_idxno" ON "_ERPPermScopes" ("IdxNo" ASC NULLS LAST);


-- =============================================================================
-- 22. BẢNG ĐĂNG KÝ TRƯỜNG PHÂN QUYỀN DỮ LIỆU (_ERPPermFields)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPPermFields" (
    "IdSeq"          VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "ResourceSeq"    VARCHAR(50) NOT NULL,    -- Lưu Id bảng _ERPMenus
    "FieldCode"      VARCHAR(100) NOT NULL,
    "FieldName"      VARCHAR(255) NOT NULL,
    "DictSeq"        BIGINT,
    "LangKey"        VARCHAR(100),
    "IsMaskable"     BOOLEAN DEFAULT false,
    "IsSensitive"    BOOLEAN DEFAULT false,
    "OrderNo"        INTEGER DEFAULT 0,
    "Comment"        TEXT,
    "RowVersion"     BIGINT DEFAULT 1,
    "IdxNo"          INTEGER,
    "CreatedBy"      VARCHAR(36),
    "CreatedAt"      TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"      VARCHAR(36),
    "UpdatedAt"      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_permfields_resourceseq" ON "_ERPPermFields" ("ResourceSeq");
CREATE INDEX IF NOT EXISTS "idx_permfields_fieldcode" ON "_ERPPermFields" ("FieldCode");
CREATE INDEX IF NOT EXISTS "idx_permfields_idxno" ON "_ERPPermFields" ("IdxNo" ASC NULLS LAST);



-- =============================================================================
-- SEED DATA MẪU CHO CÁC BẢNG QUYỀN HẠN PHẠM VI DỮ LIỆU
-- =============================================================================

-- 1. Seed Hành Động (_ERPPermActions)
INSERT INTO "_ERPPermActions" ("IdSeq", "ActionCode", "ActionName", "LangKey", "IsDefaultAllow", "Comment", "IdxNo")
VALUES
('01921345-6789-7abc-def0-323456789001', 'BTN_SEARCH',       'Truy vấn / Tìm kiếm dữ liệu (Search)',         'action.search',       true,  'Truy vấn và tìm kiếm dữ liệu trên lưới', 1),
('01921345-6789-7abc-def0-323456789002', 'BTN_CREATE',       'Thêm mới dữ liệu (Create / Insert)',          'action.create',       true,  'Thêm mới chứng từ hoặc bản ghi', 2),
('01921345-6789-7abc-def0-323456789003', 'BTN_SAVE',         'Lưu thay đổi dữ liệu (Save)',                 'action.save',         true,  'Lưu các dòng dữ liệu thêm mới hoặc sửa đổi', 3),
('01921345-6789-7abc-def0-323456789004', 'BTN_DELETE',       'Xóa dữ liệu / Xóa dòng sheet (Delete)',        'action.delete',       false, 'Xóa bản ghi hoặc các dòng chọn trên sheet', 4),
('01921345-6789-7abc-def0-323456789005', 'BTN_PRINT',        'In ấn / Xem trước bản in (Print)',            'action.print',        true,  'In biểu mẫu chứng từ hoặc báo cáo', 5),
('01921345-6789-7abc-def0-323456789006', 'BTN_EXPORT_EXCEL', 'Xuất dữ liệu Excel (Export)',                 'action.export_excel', true,  'Kết xuất dữ liệu dạng bảng ra file Excel', 6),
('01921345-6789-7abc-def0-323456789007', 'BTN_IMPORT_EXCEL', 'Nhập dữ liệu từ Excel (Import)',              'action.import_excel', false, 'Nhập dữ liệu hàng loạt từ file Excel vào hệ thống', 7),
('01921345-6789-7abc-def0-323456789008', 'BTN_APPROVE',      'Phê duyệt chứng từ (Approve)',                'action.approve',      false, 'Phê duyệt quy trình / ký duyệt chứng từ', 8),
('01921345-6789-7abc-def0-323456789009', 'BTN_REJECT',       'Từ chối phê duyệt (Reject)',                  'action.reject',       false, 'Từ chối duyệt và trả về trạng thái trước', 9),
('01921345-6789-7abc-def0-323456789010', 'BTN_LOCK',         'Khóa / Chốt dữ liệu (Lock)',                  'action.lock',         false, 'Khóa chứng từ ngăn ngừa sửa đổi sau khi chốt kỳ', 10)
ON CONFLICT ("IdSeq") DO NOTHING;

-- 2. Seed Nhóm Thuộc Tính Hệ Thống (_ERPSysAttrGroups)
INSERT INTO "_ERPSysAttrGroups" ("IdSeq", "GroupCode", "GroupName", "CodeHelp", "LangKey", "Comment", "IdxNo")
VALUES
('01921345-6789-7abc-def0-400000000001', 'SCOPE_LEVEL',    'Cấp phạm vi dữ liệu (Scope Level)',           1001, 'attr_group.scope_level',    'Định nghĩa các cấp độ giới hạn dữ liệu', 1),
('01921345-6789-7abc-def0-400000000002', 'RULE_CONDITION', 'Điều kiện quy tắc chứng từ (Rule Condition)',  1002, 'attr_group.rule_condition', 'Định nghĩa điều kiện lọc trạng thái', 2)
ON CONFLICT ("IdSeq") DO NOTHING;

-- 3. Seed Chi Tiết Giá Trị Thuộc Tính Hệ Thống (_ERPSysAttrItems)
INSERT INTO "_ERPSysAttrItems" ("IdSeq", "AttrGroupSeq", "AttrValueCode", "AttrValueName", "LangKey", "ExtraValue", "Comment", "IsActive", "IdxNo")
VALUES
-- Thuộc nhóm SCOPE_LEVEL:
('01921345-6789-7abc-def0-423456789001', '01921345-6789-7abc-def0-400000000001', 'ALL',        'Toàn hệ thống (ALL)',          'scope_level.all',        '1=1',                      'Toàn quyền truy cập mọi chi nhánh / phòng ban', true, 1),
('01921345-6789-7abc-def0-423456789002', '01921345-6789-7abc-def0-400000000001', 'BRANCH',     'Chi nhánh (BRANCH)',           'scope_level.branch',     'BranchId = @UserBranchId', 'Chỉ truy cập trong đơn vị chi nhánh công tác', true, 2),
('01921345-6789-7abc-def0-423456789003', '01921345-6789-7abc-def0-400000000001', 'DEPARTMENT', 'Phòng ban (DEPT)',            'scope_level.dept',       'DeptId = @UserDeptId',     'Chỉ truy cập trong nội bộ phòng ban', true, 3),
('01921345-6789-7abc-def0-423456789004', '01921345-6789-7abc-def0-400000000001', 'SELF',       'Chính mình / Cá nhân (SELF)',  'scope_level.self',       'CreatedBy = @UserId',      'Chỉ truy cập dữ liệu do chính tài khoản tạo', true, 4),
('01921345-6789-7abc-def0-423456789005', '01921345-6789-7abc-def0-400000000001', 'CUSTOM',     'Tùy chỉnh linh hoạt (CUSTOM)', 'scope_level.custom',     '',                         'Phạm vi cấu hình động nâng cao', true, 5),

-- Thuộc nhóm RULE_CONDITION:
('01921345-6789-7abc-def0-523456789001', '01921345-6789-7abc-def0-400000000002', 'ALL_STATUS',        'Mọi trạng thái phiếu',            'condition.all_status',        '1=1',          'Không lọc theo trạng thái', true, 1),
('01921345-6789-7abc-def0-523456789002', '01921345-6789-7abc-def0-400000000002', 'DRAFT_ONLY',         'Chỉ phiếu dự thảo / Bản nháp',   'condition.draft_only',        'Status = 0',   'Chỉ áp dụng cho chứng từ mới lập/nháp', true, 2),
('01921345-6789-7abc-def0-523456789003', '01921345-6789-7abc-def0-400000000002', 'PENDING_APPROVAL',   'Phiếu đang chờ duyệt',            'condition.pending_approval',  'Status = 1',   'Chứng từ đã gửi duyệt và chờ xử lý', true, 3),
('01921345-6789-7abc-def0-523456789004', '01921345-6789-7abc-def0-400000000002', 'APPROVED_ONLY',      'Phiếu đã duyệt hoàn tất',         'condition.approved_only',     'Status = 2',   'Chứng từ đã được phê duyệt', true, 4),
('01921345-6789-7abc-def0-523456789005', '01921345-6789-7abc-def0-400000000002', 'CLOSED_ONLY',        'Kỳ kế toán / Chứng từ đã chốt',   'condition.closed_only',       'Status = 3',   'Chứng từ đã khóa sổ', true, 5)
ON CONFLICT ("IdSeq") DO NOTHING;

-- 4. Seed Phạm Vi Dữ Liệu Liên Kết (_ERPPermScopes)


-- =============================================================================
-- BẢNG: CHI TIẾT DUYỆT SẢN LƯỢNG MES (_ERPMesApprovalDetail)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "_ERPMesApprovalDetail" (
    "IdSeq"                  VARCHAR(36) PRIMARY KEY, -- UUIDv7 khóa chính hệ thống
    "MasterSeq"              VARCHAR(36),             -- UUIDv7 liên kết Master đăng ký
    "RegCode"                TEXT,                    -- Mã đăng ký đợt
    "RowSeq"                 INTEGER DEFAULT 0,
    "SlipNo"                 TEXT NOT NULL,           -- Mã phiếu nghiệp vụ MES (VD: SLIP-TH-GS1-260929-049)
    "StageOrderNo"           TEXT,                    -- Mã lệnh công đoạn
    "OperationOrderNo"       TEXT,                    -- Mã lệnh thao tác
    "OperationName"          TEXT,                    -- Thao tác
    "MachineName"            TEXT,                    -- Máy
    "ProductCode"            TEXT,                    -- Mã hàng
    "ProductName"            TEXT,                    -- Tên hàng
    "Unit"                   TEXT,                    -- ĐVT
    "ProductionTeam"         TEXT,                    -- Tổ sản xuất
    "Creator"                TEXT,                    -- Người tạo (Tên)
    "Approver"               TEXT,                    -- Người duyệt (Tên)
    "ApprovedTime"           TEXT,                    -- Thời gian duyệt
    "StartTime"              TEXT,                    -- Bắt đầu
    "EndTime"                TEXT,                    -- Kết thúc
    "ProducedQty"            NUMERIC(18, 4) DEFAULT 0, -- SL sản xuất
    "QualifiedQty"           NUMERIC(18, 4) DEFAULT 0, -- SL đạt
    "DefectQty"              NUMERIC(18, 4) DEFAULT 0, -- SL lỗi
    "Classification"         TEXT,                    -- Phân loại
    "Status"                 TEXT,                    -- Trạng thái
    "BravoStatCode"          TEXT,                    -- Mã lệnh thống kê Bravo (VD: TK2609-453717)
    "Factory"                TEXT,                    -- Nhà máy
    "UserMemo"               TEXT,                    -- Ghi chú người dùng
    "RowVersion"             BIGINT DEFAULT 1,        -- Phiên bản bản ghi kiểm soát đồng thời
    "IsActive"               BOOLEAN DEFAULT true,    -- Trạng thái hoạt động
    "CreatedBy"              VARCHAR(36),             -- Người tạo Seq (UUIDv7)
    "CreatedByName"          TEXT,                    -- Tên người tạo
    "CreatedAt"              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"              VARCHAR(36),             -- Người cập nhật Seq (UUIDv7)
    "UpdatedByName"          TEXT,                    -- Tên người cập nhật
    "UpdatedAt"              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_mesapproval_masterseq" ON "_ERPMesApprovalDetail" ("MasterSeq");
CREATE INDEX IF NOT EXISTS "idx_mesapproval_regcode" ON "_ERPMesApprovalDetail" ("RegCode");
CREATE INDEX IF NOT EXISTS "idx_mesapproval_slipno" ON "_ERPMesApprovalDetail" ("SlipNo");
CREATE INDEX IF NOT EXISTS "idx_mesapproval_bravostatcode" ON "_ERPMesApprovalDetail" ("BravoStatCode");
CREATE INDEX IF NOT EXISTS "idx_mesapproval_operationorderno" ON "_ERPMesApprovalDetail" ("OperationOrderNo");
CREATE INDEX IF NOT EXISTS "idx_mesapproval_approvedtime" ON "_ERPMesApprovalDetail" ("ApprovedTime");

