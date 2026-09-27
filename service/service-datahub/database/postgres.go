package database

import (
	"fmt"
	"time"

	"service-datahub/config"
	"service-datahub/models"

	"go.uber.org/zap"
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
	return db.AutoMigrate(
		&models.ErpConfig{},
		&models.TokenSession{},
		&models.AuditLog{},
		&models.ErpEndpoint{},
	)
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

	return nil
}
