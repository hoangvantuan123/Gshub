package prod_stats_remark_type

import (
	"context"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"gorm.io/gorm"
	models "service-datahub/models/report"
)

const MaxBatchSize = 500

type APIError struct {
	Status  int
	Message string
}

func (e *APIError) Error() string   { return e.Message }
func invalid(message string) error  { return &APIError{400, message} }
func conflict(message string) error { return &APIError{409, message} }

type ProdStatsRemarkTypeService struct{ db *gorm.DB }

func NewProdStatsRemarkTypeService(db *gorm.DB) *ProdStatsRemarkTypeService {
	return &ProdStatsRemarkTypeService{db: db}
}

func validID(id string) bool {
	u, err := uuid.Parse(id)
	return err == nil && u.Version() == 7 && u.Variant() == uuid.RFC4122 && u.String() == id
}

func validateItems(items []models.ERPProdStatsRemarkType, update bool) error {
	if len(items) == 0 || len(items) > MaxBatchSize {
		return invalid("Số dòng phải từ 1 đến 500")
	}
	ids, codes := map[string]bool{}, map[string]bool{}
	for i := range items {
		it := &items[i]
		it.IdSeq = strings.TrimSpace(it.IdSeq)
		it.TypeCode = strings.TrimSpace(it.TypeCode)
		it.TypeName = strings.TrimSpace(it.TypeName)
		if it.TypeCode == "" || utf8.RuneCountInString(it.TypeCode) > 100 || it.TypeName == "" || utf8.RuneCountInString(it.TypeName) > 255 {
			return invalid(fmt.Sprintf("Dòng %d: TypeCode (tối đa 100 ký tự) và TypeName (tối đa 255 ký tự) bắt buộc", i+1))
		}
		if (update || it.IdSeq != "") && !validID(it.IdSeq) {
			return invalid(fmt.Sprintf("Dòng %d: IdSeq phải là UUIDv7 chuẩn", i+1))
		}
		code := strings.ToLower(it.TypeCode)
		if codes[code] || (it.IdSeq != "" && ids[it.IdSeq]) {
			return invalid("Trùng TypeCode hoặc IdSeq trong danh sách")
		}
		codes[code] = true
		if it.IdSeq != "" {
			ids[it.IdSeq] = true
		}
	}
	return nil
}

// Serialize writes because the table deliberately has no uniqueness constraints.
func (s *ProdStatsRemarkTypeService) write(ctx context.Context, fn func(*gorm.DB) error) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`LOCK TABLE "_ERPProdStatsRemarkType" IN SHARE ROW EXCLUSIVE MODE`).Error; err != nil {
			return err
		}
		return fn(tx)
	})
}

func checkCode(tx *gorm.DB, code, exceptID string) error {
	q := tx.Model(&models.ERPProdStatsRemarkType{}).Where(`LOWER(TRIM("TypeCode")) = LOWER(?)`, code)
	if exceptID != "" {
		q = q.Where(`"IdSeq" <> ?`, exceptID)
	}
	var count int64
	if err := q.Count(&count).Error; err != nil {
		return err
	}
	if count != 0 {
		return conflict("Mã phân loại đã tồn tại: " + code)
	}
	return nil
}
