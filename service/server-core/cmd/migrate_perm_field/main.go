package main

import (
	"fmt"
	"log"
	"server-core/internal/config"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func main() {
	config.Load()

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable TimeZone=Asia/Ho_Chi_Minh",
		config.Cfg.PostgresHost,
		config.Cfg.PostgresUser,
		config.Cfg.PostgresPass,
		config.Cfg.PostgresDB,
		config.Cfg.PostgresPort,
	)

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("Không thể kết nối Database: %v", err)
	}
	defer db.Close()

	query := `
	-- 1. Xóa index cũ của ResourceCode nếu có
	DROP INDEX IF EXISTS "idx_permfields_resourcecode";

	-- 2. Xóa cột ResourceCode khỏi bảng _ERPPermFields
	ALTER TABLE "_ERPPermFields" DROP COLUMN IF EXISTS "ResourceCode";

	-- 3. Đảm bảo ResourceSeq tồn tại và có index
	ALTER TABLE "_ERPPermFields" ADD COLUMN IF NOT EXISTS "ResourceSeq" VARCHAR(50);
	CREATE INDEX IF NOT EXISTS "idx_permfields_resourceseq" ON "_ERPPermFields" ("ResourceSeq");
	`

	_, err = db.Exec(query)
	if err != nil {
		log.Fatalf("Lỗi thực thi DDL: %v", err)
	}

	fmt.Println(">>> Đã xóa bỏ cột ResourceCode thừa khỏi bảng _ERPPermFields thành công (Chỉ lưu ResourceSeq)!")
}
