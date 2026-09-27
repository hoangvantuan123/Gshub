-- ====================================================================
-- Database: DATAHUB (PostgreSQL)
-- Module: System Configuration, ERP Login, Token Sessions & Audit Logs
-- ====================================================================

-- 1. BẢNG CẤU HÌNH ĐỊA CHỈ & THAM SỐ HỆ THỐNG ERP
CREATE TABLE IF NOT EXISTS "ErpConfig" (
    "ConfigKey" VARCHAR(100) PRIMARY KEY,              -- Mã định danh (vd: 'BravoDefault', 'BravoHCM')
    "ConfigName" VARCHAR(255) NOT NULL,               -- Tên hiển thị cấu hình
    "Provider" VARCHAR(50) DEFAULT 'Bravo',           -- 'Bravo', 'CustomApi', etc.
    "AuthUrl" VARCHAR(500) NOT NULL,                  -- URL endpoint xác thực login
    "BaseApiUrl" VARCHAR(500) NOT NULL,              -- URL API gốc
    "Referer" VARCHAR(500),                           -- Header Referer (nếu có)
    "ClientId" VARCHAR(255),                          -- OAuth Client ID
    "ClientSecret" VARCHAR(255),                      -- OAuth Client Secret
    "DeviceCode" VARCHAR(255),                        -- Device Code
    "ConnectionName" VARCHAR(100) DEFAULT 'Default',  -- Connection Name
    "GrantType" VARCHAR(50) DEFAULT 'password',       -- OAuth Grant Type
    "Scope" VARCHAR(255) DEFAULT 'ApiGateway offline_access',
    "InsecureSkipVerify" BOOLEAN DEFAULT true,        -- Bỏ qua chứng chỉ SSL tự ký
    "ExtraParams" JSONB,                              -- Tham số bổ sung mở rộng
    "IsActive" BOOLEAN DEFAULT true,                  -- Trạng thái kích hoạt
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Idx_ErpConfig_Provider" ON "ErpConfig"("Provider");
CREATE INDEX IF NOT EXISTS "Idx_ErpConfig_IsActive" ON "ErpConfig"("IsActive");

-- 2. BẢNG LƯU PHIÊN TOKEN SAU KHI LOGIN THÀNH CÔNG
CREATE TABLE IF NOT EXISTS "TokenSession" (
    "Id" SERIAL PRIMARY KEY,
    "ConfigKey" VARCHAR(100) NOT NULL,
    "Username" VARCHAR(100) NOT NULL,
    "AccessToken" TEXT NOT NULL,
    "TokenType" VARCHAR(50) DEFAULT 'Bearer',
    "RefreshToken" TEXT,
    "ExpiresIn" BIGINT,
    "ExpiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "Scope" VARCHAR(255),
    "RawResponse" TEXT,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("ConfigKey", "Username"),
    CONSTRAINT "Fk_TokenSession_Config" FOREIGN KEY ("ConfigKey") REFERENCES "ErpConfig"("ConfigKey") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Idx_TokenSession_ExpiresAt" ON "TokenSession"("ExpiresAt");

-- 3. BẢNG GHI NHẬT KÝ (AUDIT LOG)
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "Id" SERIAL PRIMARY KEY,
    "TraceId" VARCHAR(64),
    "ConfigKey" VARCHAR(100),
    "Username" VARCHAR(100),
    "Method" VARCHAR(10),
    "Endpoint" VARCHAR(500),
    "TargetUrl" VARCHAR(500),
    "StatusCode" INT,
    "LatencyMs" BIGINT,
    "ClientIp" VARCHAR(50),
    "UserAgent" VARCHAR(500),
    "RequestPayload" TEXT,
    "ResponseBrief" TEXT,
    "ErrorMessage" TEXT,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Idx_AuditLog_TraceId" ON "AuditLog"("TraceId");
CREATE INDEX IF NOT EXISTS "Idx_AuditLog_ConfigKey" ON "AuditLog"("ConfigKey");
CREATE INDEX IF NOT EXISTS "Idx_AuditLog_CreatedAt" ON "AuditLog"("CreatedAt");

-- ====================================================================
-- 4. BẢNG ĐĂNG KÝ CẤU HÌNH ROUTE & ENDPOINT DỊCH VỤ ERP DYNAMIC
-- ====================================================================
CREATE TABLE IF NOT EXISTS "ErpEndpoint" (
    "EndpointKey" VARCHAR(100) PRIMARY KEY,              -- Mã key định danh (vd: 'WorkDocCD_Master', 'WorkDocCD_Detail', 'WorkDocCD_Factory')
    "ConfigKey" VARCHAR(100) NOT NULL DEFAULT 'BravoDefault', -- Khóa cấu hình kết nối ERP
    "Endpoint" VARCHAR(500) NOT NULL,                    -- Hash route endpoint của Bravo ERP
    "Stn" VARCHAR(100),                                  -- Tên View SQL (vd: 'vB30WorkProcess_Explorer')
    "San" VARCHAR(100),                                  -- Alias bảng (vd: 'Ct', 'gr', 'ChildTable_Detail')
    "Alc" TEXT,                                          -- Chuỗi ALC CommandKey & Layout
    "Ndcn" VARCHAR(100),                                 -- NoDelete control name
    "Nocn" VARCHAR(100),                                 -- NoOpen control name
    "Necn" VARCHAR(100),                                 -- NoEdit control name
    "Nrcn" VARCHAR(100),                                 -- NoRecall control name
    "Fields" TEXT,                                       -- Danh sách trường dữ liệu
    "Description" VARCHAR(500),                          -- Mô tả chức năng
    "IsActive" BOOLEAN DEFAULT true,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Fk_ErpEndpoint_Config" FOREIGN KEY ("ConfigKey") REFERENCES "ErpConfig"("ConfigKey") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Idx_ErpEndpoint_ConfigKey" ON "ErpEndpoint"("ConfigKey");
CREATE INDEX IF NOT EXISTS "Idx_ErpEndpoint_IsActive" ON "ErpEndpoint"("IsActive");

-- DỮ LIỆU ĐĂNG KÝ ENDPOINT MẪU MẶC ĐỊNH
INSERT INTO "ErpEndpoint" (
    "EndpointKey", "ConfigKey", "Endpoint", "Stn", "San", "Alc", 
    "Ndcn", "Nocn", "Necn", "Nrcn", "Description"
) VALUES 
(
    'WorkDocCD_Master',
    'BravoDefault',
    '4e9b7232116b4a4af1b990d81e00a049',
    'vB30WorkProcess_Explorer',
    'Ct',
    'CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher',
    '_NoDelete_gim00a',
    '_NoOpen_esjp5f',
    '_NoEdit_tc393n',
    '_NoRecall_voxx2',
    'Truy vấn Master Lệnh Công Đoạn (Ct)'
),
(
    'WorkDocCD_Detail',
    'BravoDefault',
    '4e9b7232116b4a4af1b990d81e00a049',
    'vB30WorkProcessDetail_Explorer',
    'ChildTable_Detail',
    'CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher',
    '_NoDelete_in55v',
    '_NoOpen_osvfze',
    '_NoEdit_z1dhnu',
    '_NoRecall_a48pk',
    'Truy vấn Chi Tiết Lệnh Công Đoạn (ChildTable_Detail)'
),
(
    'WorkDocCD_Factory',
    'BravoDefault',
    '7100966925033d94da5b1876d4f4582e',
    'vB30WorkProcess_Explorer',
    'gr',
    'CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher',
    '_NoDelete_xmxz8m',
    '_NoOpen_bedh7t',
    '_NoEdit_8qcok',
    '_NoRecall_y2a9z',
    'Truy vấn Danh Mục Nhà Máy (gr)'
),
(
    'WorkDocCD_DetailTT',
    'BravoDefault',
    '4e9b7232116b4a4af1b990d81e00a049',
    'vB30WorkProcessDetailTT',
    'detailtt',
    'CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher',
    '_NoDelete_a6dw29',
    '_NoOpen_ysttqf',
    '_NoEdit_irz934',
    '_NoRecall_zr9io7',
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

