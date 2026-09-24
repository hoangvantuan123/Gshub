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
