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

	return nil
}
