package prod_stats_remark_type

import (
	"context"
	"errors"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
	models "service-datahub/models/report"
)

func TestInvalidRequestsDoNotReachDatabase(t *testing.T) {
	s := NewProdStatsRemarkTypeService(nil)
	for _, tc := range []struct{ op, body string }{
		{"A", `[]`}, {"A", `{"items":[{"TypeCode":"A"}]}`},
		{"A", `[{"TypeCode":"a","TypeName":"A"},{"TypeCode":" A ","TypeName":"B"}]`},
		{"A", `[{"IdSeq":"550e8400-e29b-41d4-a716-446655440000","TypeCode":"A","TypeName":"A"}]`},
		{"U", `[{"TypeCode":"A","TypeName":"A"}]`},
		{"D", `[]`}, {"D", `{"idSeqs":["bad-id"]}`},
		{"Q", `{"pageSize":1001}`}, {"Q", `{"page":0}`},
		{"Q", `{"IsActive":"wrong"}`}, {"Q", `{"keyword":{}}`},
		{"A", `invalid`},
	} {
		t.Run(tc.op+tc.body, func(t *testing.T) {
			_, err := s.Execute(context.Background(), tc.op, []byte(tc.body), "user")
			var apiErr *APIError
			if !errors.As(err, &apiErr) || apiErr.Status != 400 {
				t.Fatalf("expected validation error, got %v", err)
			}
		})
	}
}

func TestCatalogModelHasNoKeysOrUniqueConstraints(t *testing.T) {
	s, err := schema.Parse(&models.ERPProdStatsRemarkType{}, &sync.Map{}, schema.NamingStrategy{})
	if err != nil {
		t.Fatal(err)
	}
	if len(s.PrimaryFields) != 0 || len(s.Relationships.Relations) != 0 {
		t.Fatal("catalog must not have PK/FK")
	}
	for _, field := range s.Fields {
		if field.Unique || field.UniqueIndex != "" {
			t.Fatal("unexpected unique constraint")
		}
	}
}

// The DSN must point to a disposable test database (keyword/value format).
func TestPostgresCatalogLifecycle(t *testing.T) {
	dsn := os.Getenv("PROD_STATS_REMARK_TYPE_TEST_DSN")
	if dsn == "" {
		t.Skip("set PROD_STATS_REMARK_TYPE_TEST_DSN to a disposable PostgreSQL database")
	}
	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := admin.DB()
	defer sqlDB.Close()
	schemaName := "remark_type_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	if err := admin.Exec(`CREATE SCHEMA "` + schemaName + `"`).Error; err != nil {
		t.Fatal(err)
	}
	defer admin.Exec(`DROP SCHEMA "` + schemaName + `" CASCADE`)
	db, err := gorm.Open(postgres.Open(dsn+" search_path="+schemaName), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	testSQLDB, _ := db.DB()
	defer testSQLDB.Close()
	// The fixture intentionally contains no keys or constraints.
	for _, sql := range []string{
		`CREATE TABLE "_ERPProdStatsDetail" ("RemarkTypeSeq" VARCHAR(36))`,
	} {
		if err := db.Exec(sql).Error; err != nil {
			t.Fatal(err)
		}
	}
	if err := db.AutoMigrate(&models.ERPProdStatsRemarkType{}); err != nil {
		t.Fatal(err)
	}
	s := NewProdStatsRemarkTypeService(db)
	ctx := context.Background()
	actor := uuid.Must(uuid.NewV7()).String()
	active := false
	created, err := s.ProdStatsRemarkTypeA(ctx, []models.ERPProdStatsRemarkType{{TypeCode: " NOTE ", TypeName: "Diễn giải", IsActive: &active}}, actor)
	if err != nil {
		t.Fatal(err)
	}
	id := created[0].IdSeq
	if !validID(id) || *created[0].IsActive || *created[0].CreatedBy != actor || created[0].RowVersion != 1 {
		t.Fatalf("incorrect UUID/default/audit: %+v", created[0])
	}
	_, err = s.ProdStatsRemarkTypeA(ctx, []models.ERPProdStatsRemarkType{{TypeCode: "note", TypeName: "Trùng"}}, actor)
	var apiErr *APIError
	if !errors.As(err, &apiErr) || apiErr.Status != 409 {
		t.Fatalf("expected duplicate conflict: %v", err)
	}
	rows, page, err := s.ProdStatsRemarkTypeQ(ctx, map[string]string{"IsActive": "false", "Keyword": "diễn", "pageSize": "1"})
	if err != nil || len(rows) != 1 || page.Total != 1 {
		t.Fatalf("query failed: %+v %v", page, err)
	}
	persistedCreatedAt := rows[0].CreatedAt
	// A failed batch rolls back the first insert as well.
	_, err = s.ProdStatsRemarkTypeA(ctx, []models.ERPProdStatsRemarkType{{TypeCode: "NEW", TypeName: "Mới"}, {TypeCode: "NOTE", TypeName: "Trùng"}}, actor)
	if err == nil {
		t.Fatal("duplicate batch should fail")
	}
	rows, _, err = s.ProdStatsRemarkTypeQ(ctx, map[string]string{"TypeCode": "NEW"})
	if err != nil || len(rows) != 0 {
		t.Fatal("failed batch leaked changes")
	}
	updated, err := s.ProdStatsRemarkTypeU(ctx, []models.ERPProdStatsRemarkType{{IdSeq: id, RowVersion: created[0].RowVersion, TypeCode: "NOTE", TypeName: "Đã sửa"}}, actor)
	if err != nil || updated[0].RowVersion != 2 || *updated[0].IsActive || !updated[0].CreatedAt.Equal(*persistedCreatedAt) || *updated[0].CreatedBy != actor {
		t.Fatalf("update lost state/audit: %v", err)
	}
	_, err = s.ProdStatsRemarkTypeU(ctx, []models.ERPProdStatsRemarkType{{IdSeq: id, RowVersion: created[0].RowVersion, TypeCode: "NOTE", TypeName: "Bản cũ"}}, actor)
	if !errors.As(err, &apiErr) || apiErr.Status != 409 {
		t.Fatalf("expected stale update conflict, got %v", err)
	}
	// An update followed by a missing row must be fully rolled back.
	_, err = s.ProdStatsRemarkTypeU(ctx, []models.ERPProdStatsRemarkType{{IdSeq: id, RowVersion: updated[0].RowVersion, TypeCode: "NOTE", TypeName: "Không lưu"}, {IdSeq: uuid.Must(uuid.NewV7()).String(), RowVersion: 1, TypeCode: "MISSING", TypeName: "Thiếu"}}, actor)
	if err == nil {
		t.Fatal("missing update should fail")
	}
	rows, _, _ = s.ProdStatsRemarkTypeQ(ctx, map[string]string{"IdSeq": id})
	if rows[0].TypeName != "Đã sửa" {
		t.Fatal("failed update leaked changes")
	}
	if err := db.Exec(`INSERT INTO "_ERPProdStatsDetail" ("RemarkTypeSeq") VALUES (?)`, id).Error; err != nil {
		t.Fatal(err)
	}
	if _, err := s.ProdStatsRemarkTypeD(ctx, []string{id}); err == nil {
		t.Fatal("referenced type was deleted")
	}
	if err := db.Exec(`DELETE FROM "_ERPProdStatsDetail"`).Error; err != nil {
		t.Fatal(err)
	}
	if n, err := s.ProdStatsRemarkTypeDVersioned(ctx, []VersionedDelete{{IdSeq: id, RowVersion: created[0].RowVersion}}); err == nil || n != 0 {
		t.Fatal("stale delete should return a conflict")
	}
	if n, err := s.ProdStatsRemarkTypeDVersioned(ctx, []VersionedDelete{{IdSeq: id, RowVersion: updated[0].RowVersion}}); err != nil || n != 1 {
		t.Fatalf("delete failed: %d %v", n, err)
	}
	// Concurrent duplicate requests must result in exactly one committed row.
	var wg sync.WaitGroup
	for range 4 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = s.ProdStatsRemarkTypeA(ctx, []models.ERPProdStatsRemarkType{{TypeCode: "RACE", TypeName: "Đồng thời"}}, actor)
		}()
	}
	wg.Wait()
	rows, _, err = s.ProdStatsRemarkTypeQ(ctx, map[string]string{"TypeCode": "RACE"})
	if err != nil || len(rows) != 1 {
		t.Fatalf("duplicate writes: %d %v", len(rows), err)
	}
	// A Unicode label is counted by characters, not UTF-8 bytes.
	_, err = s.ProdStatsRemarkTypeA(ctx, []models.ERPProdStatsRemarkType{{TypeCode: "UNICODE", TypeName: strings.Repeat("ế", 255)}}, actor)
	if err != nil {
		t.Fatal(err)
	}
	var constraints int64
	if err := db.Raw(`SELECT COUNT(*) FROM pg_constraint WHERE conrelid = '"_ERPProdStatsRemarkType"'::regclass`).Scan(&constraints).Error; err != nil || constraints != 0 {
		t.Fatalf("unexpected constraints: %d %v", constraints, err)
	}
}
