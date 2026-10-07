package database

import (
	"fmt"
	"time"

	"service-datahub/config"
	"service-datahub/models"
	reportModels "service-datahub/models/report"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(cfg *config.Config, log *zap.Logger) (*gorm.DB, error) {
	dsn := cfg.DB.DSN()

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}
	if cfg.Server.Env == "development" {
		gormConfig.Logger = logger.Default.LogMode(logger.Warn)
	}

	db, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to PostgreSQL DATAHUB database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get generic database object: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.DB.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.DB.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Duration(cfg.DB.ConnMaxLifetimeMin) * time.Minute)

	// Run Auto-Migrations for DATAHUB Database
	if err := AutoMigrate(db, log); err != nil {
		return nil, fmt.Errorf("database auto-migration failed: %w", err)
	}

	// Seed Default ERP Configuration
	if err := SeedDefaults(db, cfg, log); err != nil {
		log.Warn("Failed to seed default database values", zap.Error(err))
	}

	DB = db
	log.Info("PostgreSQL DATAHUB database connection established successfully",
		zap.String("host", cfg.DB.Host),
		zap.Int("port", cfg.DB.Port),
		zap.String("database", cfg.DB.DBName),
	)

	return db, nil
}

func AutoMigrate(db *gorm.DB, log *zap.Logger) error {
	log.Info("Running database schema migrations for DATAHUB...")

	// 1. Tiền xử lý an toàn: Xóa FK constraints cũ (nếu có) và convert IdSeq/MasterSeq sang VARCHAR(36)
	preUpgradeSQL := `
	DO $$
	DECLARE
	    fk_rec RECORD;
	    r RECORD;
	BEGIN
	    -- Xóa bỏ mọi ràng buộc Foreign Key cũ trên các bảng KHSX & TKSX nếu còn tồn tại
	    FOR fk_rec IN (
	        SELECT conrelid::regclass::text AS t_name, conname AS c_name
	        FROM pg_constraint
	        WHERE contype = 'f'
	          AND (
	              conrelid::regclass::text IN ('"_ERPPlanMaster"', '"_ERPPlanDetail"', '"_ERPProdStatsDetail"', '_ERPPlanMaster', '_ERPPlanDetail', '_ERPProdStatsDetail')
	              OR confrelid::regclass::text IN ('"_ERPPlanMaster"', '_ERPPlanMaster')
	          )
	    ) LOOP
	        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I CASCADE', fk_rec.t_name, fk_rec.c_name);
	    END LOOP;

	    -- Chuyển đổi IdSeq, MasterSeq sang VARCHAR(36) nếu bảng cũ đang lưu số
	    FOR r IN (
	        SELECT table_name, column_name, data_type 
	        FROM information_schema.columns 
	        WHERE table_schema = 'public' 
	          AND table_name IN ('_ERPPlanMaster', '_ERPPlanDetail', '_ERPProdStatsDetail')
	          AND column_name IN ('IdSeq', 'MasterSeq')
	          AND data_type IN ('bigint', 'integer', 'smallint')
	    ) LOOP
	        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', r.table_name, r.column_name);
	        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE VARCHAR(36) USING %I::text', r.table_name, r.column_name, r.column_name);
	    END LOOP;
	END $$;
	`
	if err := db.Exec(preUpgradeSQL).Error; err != nil {
		log.Warn("Failed to run pre-migration cleanup/drop FK", zap.Error(err))
	}

	// 2. Chạy GORM AutoMigrate chuẩn hóa các Entity models
	err := db.AutoMigrate(
		&models.ErpConfig{},
		&models.TokenSession{},
		&models.AuditLog{},
		&models.ErpEndpoint{},
		&models.ERPUser{},
		&models.ERPRolesUser{},
		&models.ERPRolePermLog{},
		&models.ERPMenu{},
		&models.ERPRootMenu{},
		&models.ERPGroup{},
		&models.ERPLoginLog{},
		&reportModels.ERPPlanMaster{},
		&reportModels.ERPPlanDetail{},
		&reportModels.ERPProdStatsDetail{},
	)
	if err != nil {
		return err
	}

	// 3. Dọn dẹp dữ liệu phân quyền rác / legacy và chuẩn hóa cấu trúc
	cleanupLegacySQL := `
	DO $$
	BEGIN
	    -- Xóa các dòng seed cũ bị nhầm lẫn UserId với RootMenu/Menu
	    DELETE FROM "_ERPRolesUsers"
	    WHERE "CreatedBy" = 'SYSTEM_INIT' AND "Type" = 'rootmenu' AND "UserId" IS NOT NULL AND "UserId" != '';

	    -- Đảm bảo User gán nhóm chỉ có GroupId, UserId, Type = 'user'
	    UPDATE "_ERPRolesUsers"
	    SET "MenuId" = NULL, "RootMenuId" = NULL, "Name" = ''
	    WHERE "Type" = 'user';
	END $$;
	`
	_ = db.Exec(cleanupLegacySQL)

	// 4. Chuẩn hóa các cột chuỗi trong bảng chi tiết sang TEXT (tránh giới hạn độ dài ký tự từ file Excel)
	postUpgradeSQL := `
	DO $$
	DECLARE
	    r RECORD;
	BEGIN
	    FOR r IN (
	        SELECT table_name, column_name 
	        FROM information_schema.columns 
	        WHERE table_schema = 'public' 
	          AND table_name IN ('_ERPProdStatsDetail', '_ERPPlanDetail')
	          AND data_type = 'character varying'
	          AND column_name NOT IN ('WorkingTag', 'IdSeq', 'MasterSeq')
	    ) LOOP
	        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE TEXT USING %I::text', r.table_name, r.column_name, r.column_name);
	    END LOOP;

	    -- Đồng bộ sequence cho các bảng có cột Id tự tăng (tránh lỗi duplicate key AuditLog_pkey)
	    FOR r IN (
	        SELECT t.table_name, c.column_name
	        FROM information_schema.tables t
	        JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
	        WHERE t.table_schema = 'public' AND c.column_name = 'Id'
	    ) LOOP
	        BEGIN
	            EXECUTE format('SELECT setval(pg_get_serial_sequence(''"%s"'', ''Id''), COALESCE((SELECT MAX("Id") FROM "%s"), 0) + 1, false)', r.table_name, r.table_name);
	        EXCEPTION WHEN OTHERS THEN
	            -- Bỏ qua nếu bảng không dùng serial sequence
	        END;
	    END LOOP;
	END $$;
	`
	if err := db.Exec(postUpgradeSQL).Error; err != nil {
		log.Warn("Failed to verify detail columns as TEXT / sync sequences", zap.Error(err))
	} else {
		log.Info("Database schema verified and sequences synchronized successfully")
	}

	return nil
}

func SeedDefaults(db *gorm.DB, cfg *config.Config, log *zap.Logger) error {
	for _, key := range []string{"BravoDefault", "Bravo_PROD"} {
		var count int64
		if err := db.Model(&models.ErpConfig{}).Where("\"ConfigKey\" = ?", key).Count(&count).Error; err == nil && count == 0 {
			cfgItem := models.ErpConfig{
				ConfigKey:          key,
				ConfigName:         fmt.Sprintf("Bravo ERP Goldsun (%s)", key),
				Provider:           "Bravo",
				AuthUrl:            cfg.Bravo.AuthURL,
				BaseApiUrl:         cfg.Bravo.BaseAPIURL,
				Referer:            cfg.Bravo.Referer,
				ClientId:           cfg.Bravo.ClientID,
				ClientSecret:       cfg.Bravo.ClientSecret,
				DeviceCode:         cfg.Bravo.DeviceCode,
				ConnectionName:     cfg.Bravo.ConnectionName,
				GrantType:          cfg.Bravo.GrantType,
				Scope:              cfg.Bravo.Scope,
				InsecureSkipVerify: cfg.Bravo.InsecureSkipVerify,
				ExtraParams:        "{}",
				IsActive:           true,
				CreatedAt:          time.Now(),
				UpdatedAt:          time.Now(),
			}
			if err := db.Create(&cfgItem).Error; err == nil {
				log.Info("ERP Configuration seeded successfully", zap.String("config_key", key))
			}
		}
	}

	// Seed Default Endpoints
	defaultEndpoints := []models.ErpEndpoint{
		{
			EndpointKey: "WorkDocCD_Master",
			ConfigKey:   "BravoDefault",
			Endpoint:    "4e9b7232116b4a4af1b990d81e00a049",
			Stn:         "vB30WorkProcess_Explorer",
			San:         "Ct",
			Alc:         "CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher",
			Ndcn:        "_NoDelete_gim00a",
			Nocn:        "_NoOpen_esjp5f",
			Necn:        "_NoEdit_tc393n",
			Nrcn:        "_NoRecall_voxx2",
			Description: "Truy vấn Master Lệnh Công Đoạn (Ct)",
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			EndpointKey: "WorkDocCD_Detail",
			ConfigKey:   "BravoDefault",
			Endpoint:    "4e9b7232116b4a4af1b990d81e00a049",
			Stn:         "vB30WorkProcessDetail_Explorer",
			San:         "ChildTable_Detail",
			Alc:         "CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher",
			Ndcn:        "_NoDelete_in55v",
			Nocn:        "_NoOpen_osvfze",
			Necn:        "_NoEdit_z1dhnu",
			Nrcn:        "_NoRecall_a48pk",
			Description: "Truy vấn Chi Tiết Lệnh Công Đoạn (ChildTable_Detail)",
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			EndpointKey: "WorkDocCD_Factory",
			ConfigKey:   "BravoDefault",
			Endpoint:    "7100966925033d94da5b1876d4f4582e",
			Stn:         "vB30WorkProcess_Explorer",
			San:         "gr",
			Alc:         "CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher",
			Ndcn:        "_NoDelete_xmxz8m",
			Nocn:        "_NoOpen_bedh7t",
			Necn:        "_NoEdit_8qcok",
			Nrcn:        "_NoRecall_y2a9z",
			Description: "Truy vấn Danh Mục Nhà Máy (gr)",
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			EndpointKey: "WorkDocCD_DetailTT",
			ConfigKey:   "BravoDefault",
			Endpoint:    "4e9b7232116b4a4af1b990d81e00a049",
			Stn:         "vB30WorkProcessDetailTT",
			San:         "detailtt",
			Alc:         "CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher",
			Ndcn:        "_NoDelete_bggduv",
			Nocn:        "_NoOpen_gi177m",
			Necn:        "_NoEdit_25en9",
			Nrcn:        "_NoRecall_w1f9sb",
			Description: "Truy vấn Chi Tiết Lệnh Thao Tác Quyết Toán (detailtt)",
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	for _, ep := range defaultEndpoints {
		var epCount int64
		_ = db.Model(&models.ErpEndpoint{}).Where("\"EndpointKey\" = ?", ep.EndpointKey).Count(&epCount).Error
		if epCount == 0 {
			if err := db.Create(&ep).Error; err != nil {
				log.Warn("Failed to seed ERP endpoint", zap.String("key", ep.EndpointKey), zap.Error(err))
			}
		}
	}

	// Seed Default System Admin Users
	seedUsers := []struct {
		UserId   string
		UserName string
		Password string
		DeptName string
	}{
		{UserId: "superadmin", UserName: "Super Administrator", Password: "Admin@123", DeptName: "Ban Điều Hành"},
		{UserId: "admin", UserName: "Quản trị viên", Password: "Admin@123", DeptName: "Ban Giám Đốc"},
		{UserId: "IT_TUANHV", UserName: "Hoàng Văn Tuấn", Password: "Tuan3112@", DeptName: "Phòng IT"},
	}

	for _, su := range seedUsers {
		var uCount int64
		_ = db.Model(&models.ERPUser{}).Where("LOWER(\"UserId\") = LOWER(?)", su.UserId).Count(&uCount).Error
		if uCount == 0 {
			hashed, _ := bcrypt.GenerateFromPassword([]byte(su.Password), bcrypt.DefaultCost)
			hashStr := string(hashed)
			uSeq, _ := uuid.NewV7()
			user := models.ERPUser{
				UserSeq:     uSeq.String(),
				CompanySeq:  1,
				IdxNo:       1,
				EmpID:       su.UserId,
				EmpCode:     su.UserId,
				EmpName:     su.UserName,
				DeptName:    su.DeptName,
				UserId:      su.UserId,
				UserType:    1,
				UserName:    su.UserName,
				EmpSeq:      1,
				Password2:   &hashStr,
				CheckPass1:  true,
				StatusAcc:   false,
				Active:      true,
				LanguageSeq: 6,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
				CreatedBy:   "SYSTEM_SEED",
			}
			if err := db.Create(&user).Error; err == nil {
				log.Info("Default ERP Admin User seeded successfully", zap.String("user_id", su.UserId))
			}
		}
	}

	return nil
}
