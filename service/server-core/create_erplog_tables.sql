-- =============================================================================
-- FILE SQL TẠO BẢNG HỆ THỐNG LOG VÀ BIẾN ĐỘNG DỮ LIỆU TÊN DATABASE: ERPLOG
-- =============================================================================
-- Hướng dẫn: Mở DBeaver / pgAdmin / psql kết nối tới Database `ERPLOG` và chạy script này.
-- Khóa chính toàn bộ sử dụng UUIDv7 (36 ký tự).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG NHẬT KÝ ĐĂNG NHẬP (_ERPLoginFullLogs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_ERPLoginFullLogs" (
    "IdSeq"            VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "UserSeq"          VARCHAR(36),             -- UUIDv7 liên kết với _ERPUsers
    "Login"            VARCHAR(100),            -- Tên tài khoản đăng nhập
    "IdxNo"            INTEGER,
    "DeviceId"         VARCHAR(255),
    "StatusLogs"       VARCHAR(50),             -- SUCCESS, FAILED, LOCKED, etc.
    "DeviceInfoWeb"    TEXT,                    -- Thông tin thiết bị mã hóa/JSON
    "DeviceInfoSoft"   TEXT,
    "DeviceInfoApp"    TEXT,
    "DeviceInfoWebIV"  TEXT,
    "DeviceInfoSoftIV" TEXT,
    "DeviceInfoAppIV"  TEXT,
    "PlatformStatus"   VARCHAR(50),             -- Web, Soft, App
    "CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_login_logs_userseq" ON "_ERPLoginFullLogs" ("UserSeq");
CREATE INDEX IF NOT EXISTS "idx_login_logs_createdat" ON "_ERPLoginFullLogs" ("CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_login_logs_login" ON "_ERPLoginFullLogs" ("Login");


-- -----------------------------------------------------------------------------
-- 2. BẢNG AUDIT LOG KIỂM TOÁN THAO TÁC API gRPC (_SysFullAuditLog)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_SysFullAuditLog" (
    "IdSeq"        VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "ModuleName"   VARCHAR(100),            -- micro-user-go
    "ServiceName"  VARCHAR(100),            -- e.g., UsersService
    "MethodName"   VARCHAR(100),            -- e.g., UsersAuthU
    "ActionType"   VARCHAR(50),             -- A, U, D, Q, L
    "UrlPath"      TEXT,                    -- Full gRPC path
    "RequestData"  TEXT,                    -- Input Payload JSON
    "ResponseData" TEXT,                    -- Output Payload JSON or Error
    "StatusCode"   INTEGER,                 -- 200, 400, 500, etc.
    "StatusMsg"    VARCHAR(255),            -- Success or Error Message
    "DurationMs"   BIGINT,                  -- Execution time in ms
    "UserSeq"      VARCHAR(36),             -- Executing user ID
    "UserLogin"    VARCHAR(100),            -- Executing user login
    "ClientIp"     VARCHAR(50),             -- IP address
    "Token"        TEXT,                    -- Session Token
    "CreatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_sys_audit_log_userseq" ON "_SysFullAuditLog" ("UserSeq");
CREATE INDEX IF NOT EXISTS "idx_sys_audit_log_createdat" ON "_SysFullAuditLog" ("CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_sys_audit_log_module" ON "_SysFullAuditLog" ("ModuleName");


-- -----------------------------------------------------------------------------
-- 3. BẢNG MASTER LÔ SAVE SHEET (_SysDataChangeLog)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_SysDataChangeLog" (
    "IdSeq"            VARCHAR(36) PRIMARY KEY, -- UUIDv7 (BatchId)
    "ApiMethod"        VARCHAR(100) NOT NULL,   -- Ví dụ: UsersAuthU, UsersAuthA
    "TableName"        VARCHAR(100) NOT NULL,   -- Ví dụ: _ERPUsers, _ERPMenus
    "TotalRecords"     INTEGER DEFAULT 0,       -- Tổng số hàng gửi lên từ Sheet
    "SuccessCount"     INTEGER DEFAULT 0,       -- Số hàng lưu thành công
    "FailedCount"      INTEGER DEFAULT 0,       -- Số hàng lưu thất bại
    "OverallStatus"    VARCHAR(20),             -- SUCCESS, PARTIAL_SUCCESS, FAILED
    "UserSeq"          VARCHAR(36),             -- ID người dùng thực hiện
    "UserLogin"        VARCHAR(100),            -- Tên tài khoản
    "ClientIp"         VARCHAR(50),             -- IP máy khách
    "DeviceInfoWeb"    TEXT,                    -- Thiết bị Web
    "DeviceInfoSoft"   TEXT,                    -- Thiết bị Soft PC
    "DeviceInfoApp"    TEXT,                    -- Thiết bị Mobile
    "PlatformStatus"   VARCHAR(50),             -- Nền tảng (Web/Soft/App)
    "TraceId"          VARCHAR(36),             -- Liên kết IdSeq của _SysFullAuditLog
    "CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_datachange_createdat" ON "_SysDataChangeLog" ("CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_datachange_table" ON "_SysDataChangeLog" ("TableName");


-- -----------------------------------------------------------------------------
-- 4. BẢNG CHI TIẾT TỪNG HÀNG TRONG SHEET (_SysDataChangeRowLog)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_SysDataChangeRowLog" (
    "IdSeq"            VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "ChangeLogSeq"     VARCHAR(36) NOT NULL,    -- FK -> _SysDataChangeLog.IdSeq
    "TableName"        VARCHAR(100) NOT NULL,   -- Tên bảng (Ví dụ: _ERPUsers)
    "RecordId"         VARCHAR(100) NOT NULL,   -- ID/UserSeq của hàng dữ liệu
    "RowIdx"           INTEGER,                 -- Số thứ tự dòng trên Sheet
    "ActionType"       VARCHAR(10)  NOT NULL,   -- 'A' (Add), 'U' (Update), 'D' (Delete)
    "Status"           VARCHAR(20)  NOT NULL,   -- 'SUCCESS' hoặc 'FAILED'
    "ErrorCode"        VARCHAR(50),             -- Mã lỗi riêng của dòng này (nếu bị lỗi)
    "ErrorMsg"         TEXT,                    -- Thông báo lỗi chi tiết của dòng này
    "SubmittedData"    TEXT,                    -- JSON dữ liệu gửi lên cho dòng này
    "CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEX TỐI ƯU TRA CỨU CỰC NHANH LỊCH SỬ 1 DÒNG DỮ LIỆU
CREATE INDEX IF NOT EXISTS "idx_rowlog_table_record" ON "_SysDataChangeRowLog" ("TableName", "RecordId", "CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_rowlog_changelogseq" ON "_SysDataChangeRowLog" ("ChangeLogSeq");


-- -----------------------------------------------------------------------------
-- 5. BẢNG BIẾN ĐỘNG CỘT DỮ LIỆU OLD ➔ NEW (_SysDataChangeDetail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_SysDataChangeDetail" (
    "IdSeq"        VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "RowLogSeq"    VARCHAR(36) NOT NULL,    -- FK -> _SysDataChangeRowLog.IdSeq
    "FieldName"    VARCHAR(100) NOT NULL,   -- Tên cột bị sửa (Email, StatusAcc,...)
    "OldValue"     TEXT,                    -- Giá trị cũ trên DB
    "NewValue"     TEXT,                    -- Giá trị mới sửa
    "CreatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_detail_rowlogseq" ON "_SysDataChangeDetail" ("RowLogSeq");
