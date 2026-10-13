package auth

import (
	"context"
	"database/sql"
	"os"
	"testing"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"service-datahub/config"
)

func TestPermissionStoreReadOnly(t *testing.T) {
	if os.Getenv("TEST_PERMISSION_STORE") != "1" {
		t.Skip("set TEST_PERMISSION_STORE=1 for local read-only database validation")
	}
	if err := godotenv.Load("../.env"); err != nil {
		t.Fatal("cannot load local database configuration")
	}
	cfg, err := config.LoadConfig()
	if err != nil {
		t.Fatal("cannot load database configuration")
	}
	db, err := gorm.Open(postgres.Open(cfg.DB.DSN()), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal("cannot connect to permission store")
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()
	err = db.Transaction(func(tx *gorm.DB) error {
		var userSeq string
		if err := tx.Raw(`SELECT "UserSeq"::text FROM "_ERPRolesUsers" WHERE "Type"='user' AND "UserSeq" IS NOT NULL LIMIT 1`).Scan(&userSeq).Error; err != nil {
			return err
		}
		if userSeq == "" {
			t.Fatal("no assigned user available for permission lookup")
		}
		for _, operation := range []string{"Search", "Create", "Edit", "Delete"} {
			if _, err := CheckMenuPermission(context.Background(), tx, &AuthenticatedUser{UserSeq: userSeq}, []string{"report_registration"}, operation); err != nil {
				return err
			}
		}
		allowed, err := CheckMenuPermission(context.Background(), tx, &AuthenticatedUser{UserSeq: "00000000-0000-0000-0000-000000000000"}, []string{"report_registration"}, "Delete")
		if err != nil {
			return err
		}
		if allowed {
			t.Fatal("unassigned user gained Delete")
		}
		return nil
	}, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		t.Fatal(err)
	}
}
