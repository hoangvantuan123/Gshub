package database

import (
	"fmt"
	"server-core/internal/config"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB
var DBLogs *gorm.DB
var SqlxDB *sqlx.DB
var SqlxDBLogs *sqlx.DB

func Connect(log *zap.Logger) error {
	var err error

	// 1. Primary DB (DB ERP chính)
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable TimeZone=Asia/Ho_Chi_Minh",
		config.Cfg.PostgresHost,
		config.Cfg.PostgresUser,
		config.Cfg.PostgresPass,
		config.Cfg.PostgresDB,
		config.Cfg.PostgresPort,
	)

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to primary database (GORM): %w", err)
	}

	maxConns := config.Cfg.PostgresMaxConns
	minConns := config.Cfg.PostgresMinConns

	if maxConns <= 0 || minConns <= 0 {
		var serverMaxStr string
		errRow := DB.Raw("SHOW max_connections").Scan(&serverMaxStr).Error
		serverMax := 100
		if errRow == nil && serverMaxStr != "" {
			fmt.Sscanf(serverMaxStr, "%d", &serverMax)
		}

		if maxConns <= 0 {
			// Dành ra 35% sức chứa của DB server cho microservice này
			maxConns = (serverMax * 35) / 100
			if maxConns < 10 {
				maxConns = 10
			}
		}
		if minConns <= 0 {
			minConns = maxConns / 4
			if minConns < 5 {
				minConns = 5
			}
		}
		log.Info("Auto-detected PostgreSQL max_connections setting",
			zap.Int("server_max_connections", serverMax),
			zap.Int("auto_pool_max_conns", maxConns),
			zap.Int("auto_pool_min_conns", minConns),
		)
	}

	sqlDB, _ := DB.DB()
	sqlDB.SetMaxOpenConns(maxConns)
	sqlDB.SetMaxIdleConns(minConns)
	sqlDB.SetConnMaxLifetime(time.Hour)
	sqlDB.SetConnMaxIdleTime(30 * time.Minute)
	SqlxDB = sqlx.NewDb(sqlDB, "postgres")

	log.Info("Successfully connected to Primary Database (GORM & SQLX Auto-Tuned)",
		zap.Int("max_conns", maxConns),
		zap.Int("min_conns", minConns),
	)

	if config.Cfg.PostgresDBLogs != "" {
		dsnLogs := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable TimeZone=Asia/Ho_Chi_Minh",
			config.Cfg.PostgresHost,
			config.Cfg.PostgresUser,
			config.Cfg.PostgresPass,
			config.Cfg.PostgresDBLogs,
			config.Cfg.PostgresPort,
		)

		DBLogs, err = gorm.Open(postgres.Open(dsnLogs), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err != nil {
			log.Warn("Failed to connect to Logs Database, continuing without it", zap.Error(err))
		} else {
			sqlDBLogs, _ := DBLogs.DB()
			sqlDBLogs.SetMaxOpenConns(maxConns)
			sqlDBLogs.SetMaxIdleConns(minConns)
			sqlDBLogs.SetConnMaxLifetime(time.Hour)
			sqlDBLogs.SetConnMaxIdleTime(30 * time.Minute)
			SqlxDBLogs = sqlx.NewDb(sqlDBLogs, "postgres")
			log.Info("Successfully connected to Logs Database (GORM & SQLX Auto-Tuned)")
		}
	}

	// Auto-Migrate / Tự động tạo bảng Log & Audit nếu chưa tồn tại trong Database
	targetLogDb := SqlxDBLogs
	if targetLogDb == nil {
		targetLogDb = SqlxDB
	}
	if targetLogDb != nil {
		ensureLogTablesExist(targetLogDb, log)
	}

	if SqlxDB != nil {
		ensureERPTablesExist(SqlxDB, log)
	}

	return nil
}

const erpTablesSchemaSQL = `
-- 1. BẢNG NGÔN NGỮ (_ERPLanguage)
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

-- 2. BẢNG TỪ ĐIỂN ĐA NGÔN NGỮ (_ERPDictionary)
CREATE TABLE IF NOT EXISTS "_ERPDictionary" (
    "IdSeq"        BIGSERIAL PRIMARY KEY,
    "WordSeq"      INTEGER,
    "LanguageSeq"  INTEGER,
    "Word"         TEXT,
    "IdxNo"        INTEGER
);
CREATE INDEX IF NOT EXISTS "idx_dict_languageseq" ON "_ERPDictionary" ("LanguageSeq");
CREATE INDEX IF NOT EXISTS "idx_dict_wordseq" ON "_ERPDictionary" ("WordSeq");

-- 3. BẢNG PHIÊN BẢN TỪ ĐIỂN (_ERPDictVer)
CREATE TABLE IF NOT EXISTS "_ERPDictVer" (
    "LanguageSeq"  INTEGER PRIMARY KEY,
    "LanguageCode" VARCHAR(20) NOT NULL UNIQUE,
    "VersionHash"  VARCHAR(128) NOT NULL,
    "UpdatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_erp_dict_ver_language_code" ON "_ERPDictVer" ("LanguageCode");

-- 4. BẢNG KỸ THUẬT NHÓM BẢNG (_ERPTblGrp)
CREATE TABLE IF NOT EXISTS "_ERPTblGrp" (
    "IdSeq"     VARCHAR(36) PRIMARY KEY,
    "IdxNo"     INTEGER,
    "KeyCode"   VARCHAR(100),
    "TableName" VARCHAR(255),
    "CreatedBy" VARCHAR(36),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy" VARCHAR(36),
    "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG KỸ THUẬT ITEM NHÓM BẢNG (_ERPTblGrpItem)
CREATE TABLE IF NOT EXISTS "_ERPTblGrpItem" (
    "IdSeq"     VARCHAR(36) PRIMARY KEY,
    "IdxNo"     INTEGER,
    "TblGrpSeq" VARCHAR(36),
    "KeyCode"   VARCHAR(100),
    "CreatedBy" VARCHAR(36),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy" VARCHAR(36),
    "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BẢNG QUYỀN NHÓM BẢNG (_ERPTblGrpPerm)
CREATE TABLE IF NOT EXISTS "_ERPTblGrpPerm" (
    "IdSeq"          VARCHAR(36) PRIMARY KEY,
    "IdxNo"          INTEGER,
    "TblGrpPermName" VARCHAR(255),
    "CreatedBy"      VARCHAR(36),
    "CreatedAt"      TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"      VARCHAR(36),
    "UpdatedAt"      TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BẢNG CHI TIẾT PHÂN QUYỀN NHÓM BẢNG THEO VAI TRÒ (_ERPTblGrpPermRole)
CREATE TABLE IF NOT EXISTS "_ERPTblGrpPermRole" (
    "IdSeq"         VARCHAR(36) PRIMARY KEY,
    "IdxNo"         INTEGER,
    "TblGrpPermSeq" VARCHAR(36),
    "TblGrpSeq"     VARCHAR(36),
    "TblGrpItemSeq" VARCHAR(36),
    "UserSeq"       VARCHAR(36),
    "TypeRole"      VARCHAR(50),
    "View"          BOOLEAN DEFAULT false,
    "Edit"          BOOLEAN DEFAULT false,
    "CreatedBy"     VARCHAR(36),
    "CreatedAt"     TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"     VARCHAR(36),
    "UpdatedAt"     TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BẢNG HÀNH ĐỘNG QUYỀN HẠN (_ERPPermActions)
CREATE TABLE IF NOT EXISTS "_ERPPermActions" (
    "IdSeq"          VARCHAR(36) PRIMARY KEY,
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

-- 9. BẢNG NHÓM THUỘC TÍNH HỆ THỐNG (_ERPSysAttrGroups)
CREATE TABLE IF NOT EXISTS "_ERPSysAttrGroups" (
    "IdSeq"          VARCHAR(36) PRIMARY KEY,
    "GroupCode"      VARCHAR(100) NOT NULL,
    "GroupName"      VARCHAR(255),
    "CodeHelp"       BIGINT NOT NULL DEFAULT 1000,
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

-- 10. BẢNG CHI TIẾT GIÁ TRỊ THUỘC TÍNH (_ERPSysAttrItems)
CREATE TABLE IF NOT EXISTS "_ERPSysAttrItems" (
    "IdSeq"          VARCHAR(36) PRIMARY KEY,
    "AttrGroupSeq"   VARCHAR(36),
    "AttrValueCode"  VARCHAR(100) NOT NULL,
    "AttrValueName"  VARCHAR(255),
    "LangKey"        VARCHAR(100),
    "ExtraValue"     TEXT,
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

-- 11. BẢNG PHẠM VI DỮ LIỆU (_ERPPermScopes)
CREATE TABLE IF NOT EXISTS "_ERPPermScopes" (
    "IdSeq"             VARCHAR(36) PRIMARY KEY,
    "ScopeCode"         VARCHAR(100),
    "ScopeName"         VARCHAR(255),
    "LangKey"           VARCHAR(100),
    "PermActionSeq"     VARCHAR(36),
    "ScopeLevelSeq"     VARCHAR(36),
    "RuleConditionSeq"  VARCHAR(36),
    "ConditionSql"      TEXT,
    "Comment"           TEXT,
    "RowVersion"        BIGINT DEFAULT 1,
    "IdxNo"             INTEGER,
    "CreatedBy"         VARCHAR(36),
    "CreatedAt"         TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"         VARCHAR(36),
    "UpdatedAt"         TIMESTAMPTZ DEFAULT NOW()
);

-- 12. BẢNG TRƯỜNG PHÂN QUYỀN DỮ LIỆU (_ERPPermFields)
CREATE TABLE IF NOT EXISTS "_ERPPermFields" (
    "IdSeq"          VARCHAR(36) PRIMARY KEY,
    "ResourceSeq"    VARCHAR(50) NOT NULL,
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

-- Seed Ngôn ngữ mặc định
INSERT INTO "_ERPLanguage" ("LanguageSeq", "LanguageCode", "LanguageName", "Remark", "IdxNo")
VALUES
(1, 'en-US', 'English (en-US)', 'English', 1),
(2, 'ko-KR', 'Korean (ko-KR)', 'Korean', 2),
(6, 'vi-VN', 'Tiếng Việt (vi-VN)', 'Tiếng Việt', 3)
ON CONFLICT ("LanguageSeq") DO NOTHING;

-- Seed Phiên bản từ điển mặc định
INSERT INTO "_ERPDictVer" ("LanguageSeq", "LanguageCode", "VersionHash", "UpdatedAt")
VALUES
(1, 'en-US', 'INIT_EN_V1', NOW()),
(2, 'ko-KR', 'INIT_KO_V1', NOW()),
(6, 'vi-VN', 'INIT_VI_V1', NOW())
ON CONFLICT ("LanguageSeq") DO NOTHING;

-- Seed Hành động mặc định
INSERT INTO "_ERPPermActions" ("IdSeq", "ActionCode", "ActionName", "LangKey", "IsDefaultAllow", "Comment", "IdxNo")
VALUES
('01921345-6789-7abc-def0-323456789001', 'BTN_SEARCH',       'Truy vấn / Tìm kiếm dữ liệu (Search)',         'action.search',       true,  'Truy vấn và tìm kiếm dữ liệu trên lưới', 1),
('01921345-6789-7abc-def0-323456789002', 'BTN_CREATE',       'Thêm mới dữ liệu (Create / Insert)',          'action.create',       true,  'Thêm mới chứng từ hoặc bản ghi', 2),
('01921345-6789-7abc-def0-323456789003', 'BTN_SAVE',         'Lưu thay đổi dữ liệu (Save)',                 'action.save',         true,  'Lưu các dòng dữ liệu thêm mới hoặc sửa đổi', 3),
('01921345-6789-7abc-def0-323456789004', 'BTN_DELETE',       'Xóa dữ liệu / Xóa dòng sheet (Delete)',        'action.delete',       false, 'Xóa bản ghi hoặc các dòng chọn trên sheet', 4),
('01921345-6789-7abc-def0-323456789005', 'BTN_PRINT',        'In ấn / Xem trước bản in (Print)',            'action.print',        true,  'In biểu mẫu chứng từ hoặc báo cáo', 5),
('01921345-6789-7abc-def0-323456789006', 'BTN_EXPORT_EXCEL', 'Xuất dữ liệu Excel (Export)',                 'action.export_excel', true,  'Kết xuất dữ liệu dạng bảng ra file Excel', 6),
('01921345-6789-7abc-def0-323456789007', 'BTN_IMPORT_EXCEL', 'Nhập dữ liệu từ Excel (Import)',              'action.import_excel', false, 'Nhập dữ liệu hàng loạt từ file Excel vào hệ thống', 7)
ON CONFLICT ("IdSeq") DO NOTHING;
`

func ensureERPTablesExist(db *sqlx.DB, log *zap.Logger) {
	if _, err := db.Exec(erpTablesSchemaSQL); err != nil {
		log.Warn("Could not auto-verify ERP tables schema", zap.Error(err))
	} else {
		log.Info("Verified ERP Database tables (_ERPLanguage, _ERPDictionary, _ERPTblGrp, _ERPPermActions, _ERPSysAttrGroups, etc.)")
	}
}

const logTablesSchemaSQL = `
CREATE TABLE IF NOT EXISTS "_ERPLoginFullLogs" (
    "IdSeq"            VARCHAR(36) PRIMARY KEY,
    "UserSeq"          VARCHAR(36),
    "Login"            VARCHAR(100),
    "IdxNo"            INTEGER,
    "DeviceId"         VARCHAR(255),
    "StatusLogs"       VARCHAR(50),
    "DeviceInfoWeb"    TEXT,
    "DeviceInfoSoft"   TEXT,
    "DeviceInfoApp"    TEXT,
    "DeviceInfoWebIV"  TEXT,
    "DeviceInfoSoftIV" TEXT,
    "DeviceInfoAppIV"  TEXT,
    "PlatformStatus"   VARCHAR(50),
    "CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_login_logs_userseq" ON "_ERPLoginFullLogs" ("UserSeq");
CREATE INDEX IF NOT EXISTS "idx_login_logs_createdat" ON "_ERPLoginFullLogs" ("CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_login_logs_login" ON "_ERPLoginFullLogs" ("Login");

CREATE TABLE IF NOT EXISTS "_SysFullAuditLog" (
    "IdSeq"        VARCHAR(36) PRIMARY KEY,
    "ModuleName"   VARCHAR(100),
    "ServiceName"  VARCHAR(100),
    "MethodName"   VARCHAR(100),
    "ActionType"   VARCHAR(50),
    "UrlPath"      TEXT,
    "RequestData"  TEXT,
    "ResponseData" TEXT,
    "StatusCode"   INTEGER,
    "StatusMsg"    VARCHAR(255),
    "DurationMs"   BIGINT,
    "UserSeq"      VARCHAR(36),
    "UserLogin"    VARCHAR(100),
    "ClientIp"     VARCHAR(50),
    "Token"        TEXT,
    "CreatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_sys_audit_log_userseq" ON "_SysFullAuditLog" ("UserSeq");
CREATE INDEX IF NOT EXISTS "idx_sys_audit_log_createdat" ON "_SysFullAuditLog" ("CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_sys_audit_log_module" ON "_SysFullAuditLog" ("ModuleName");

CREATE TABLE IF NOT EXISTS "_SysDataChangeLog" (
    "IdSeq"            VARCHAR(36) PRIMARY KEY,
    "ApiMethod"        VARCHAR(100) NOT NULL,
    "TableName"        VARCHAR(100) NOT NULL,
    "TotalRecords"     INTEGER DEFAULT 0,
    "SuccessCount"     INTEGER DEFAULT 0,
    "FailedCount"      INTEGER DEFAULT 0,
    "OverallStatus"    VARCHAR(20),
    "UserSeq"          VARCHAR(36),
    "UserLogin"        VARCHAR(100),
    "ClientIp"         VARCHAR(50),
    "DeviceInfoWeb"    TEXT,
    "DeviceInfoSoft"   TEXT,
    "DeviceInfoApp"    TEXT,
    "PlatformStatus"   VARCHAR(50),
    "TraceId"          VARCHAR(36),
    "CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_datachange_createdat" ON "_SysDataChangeLog" ("CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_datachange_table" ON "_SysDataChangeLog" ("TableName");

CREATE TABLE IF NOT EXISTS "_SysDataChangeRowLog" (
    "IdSeq"            VARCHAR(36) PRIMARY KEY,
    "ChangeLogSeq"     VARCHAR(36) NOT NULL,
    "TableName"        VARCHAR(100) NOT NULL,
    "RecordId"         VARCHAR(100) NOT NULL,
    "RowIdx"           INTEGER,
    "ActionType"       VARCHAR(10)  NOT NULL,
    "Status"           VARCHAR(20)  NOT NULL,
    "ErrorCode"        VARCHAR(50),
    "ErrorMsg"         TEXT,
    "SubmittedData"    TEXT,
    "CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_rowlog_table_record" ON "_SysDataChangeRowLog" ("TableName", "RecordId", "CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_rowlog_changelogseq" ON "_SysDataChangeRowLog" ("ChangeLogSeq");

CREATE TABLE IF NOT EXISTS "_SysDataChangeDetail" (
    "IdSeq"        VARCHAR(36) PRIMARY KEY,
    "RowLogSeq"    VARCHAR(36) NOT NULL,
    "FieldName"    VARCHAR(100) NOT NULL,
    "OldValue"     TEXT,
    "NewValue"     TEXT,
    "CreatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_detail_rowlogseq" ON "_SysDataChangeDetail" ("RowLogSeq");
`

func ensureLogTablesExist(db *sqlx.DB, log *zap.Logger) {
	if _, err := db.Exec(logTablesSchemaSQL); err != nil {
		log.Warn("Could not auto-verify log tables schema", zap.Error(err))
	} else {
		log.Info("Verified Log & Audit Database tables (_ERPLoginFullLogs, _SysFullAuditLog)")
	}
}
