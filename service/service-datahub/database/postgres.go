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
	)
}

func SeedDefaults(db *gorm.DB, cfg *config.Config, log *zap.Logger) error {
	var count int64
	if err := db.Model(&models.ErpConfig{}).Where("\"ConfigKey\" = ?", "BravoDefault").Count(&count).Error; err != nil {
		return err
	}

	if count == 0 {
		defaultConfig := models.ErpConfig{
			ConfigKey:          "BravoDefault",
			ConfigName:         "Bravo ERP Goldsun",
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

		if err := db.Create(&defaultConfig).Error; err != nil {
			return err
		}
		log.Info("Default ERP Configuration seeded successfully (BravoDefault)")
	}
	return nil
}
