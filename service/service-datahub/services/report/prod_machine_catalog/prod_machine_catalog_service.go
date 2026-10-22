package prod_machine_catalog

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

type ProdMachineCatalogService struct{ db *gorm.DB }

func NewProdMachineCatalogService(db *gorm.DB) *ProdMachineCatalogService {
	return &ProdMachineCatalogService{db: db}
}

func validID(id string) bool {
	u, err := uuid.Parse(id)
	return err == nil && u.Version() == 7 && u.Variant() == uuid.RFC4122 && u.String() == id
}

func validateItems(items []models.ERPProdMachineCatalog, update bool) error {
	if len(items) == 0 || len(items) > MaxBatchSize {
		return invalid("Số dòng phải từ 1 đến 500")
	}
	ids, codes := map[string]bool{}, map[string]bool{}
	for i := range items {
		it := &items[i]
		it.IdSeq = strings.TrimSpace(it.IdSeq)
		it.MachineCode = strings.TrimSpace(it.MachineCode)
		it.MachineName = strings.TrimSpace(it.MachineName)
		it.TeamCode = strings.TrimSpace(it.TeamCode)
		it.TeamName = strings.TrimSpace(it.TeamName)
		it.Factory = strings.TrimSpace(it.Factory)

		if it.MachineCode == "" || utf8.RuneCountInString(it.MachineCode) > 100 {
			return invalid(fmt.Sprintf("Dòng %d: Mã máy không được để trống và tối đa 100 ký tự", i+1))
		}
		if it.MachineName == "" || utf8.RuneCountInString(it.MachineName) > 255 {
			return invalid(fmt.Sprintf("Dòng %d: Tên máy móc không được để trống và tối đa 255 ký tự", i+1))
		}
		if (update || it.IdSeq != "") && !validID(it.IdSeq) {
			return invalid(fmt.Sprintf("Dòng %d: IdSeq phải là UUIDv7 chuẩn", i+1))
		}
		if update && it.RowVersion < 1 {
			return invalid(fmt.Sprintf("Dòng %d: RowVersion phải lớn hơn 0", i+1))
		}
		code := strings.ToLower(it.MachineCode)
		if codes[code] || (it.IdSeq != "" && ids[it.IdSeq]) {
			return invalid("Trùng Mã máy hoặc IdSeq trong danh sách gửi lên")
		}
		codes[code] = true
		if it.IdSeq != "" {
			ids[it.IdSeq] = true
		}
	}
	return nil
}

// Serialize writes because the table deliberately has no uniqueness constraints in DB.
func (s *ProdMachineCatalogService) write(ctx context.Context, fn func(*gorm.DB) error) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`LOCK TABLE "_ERPProdMachineCatalog" IN SHARE ROW EXCLUSIVE MODE`).Error; err != nil {
			return err
		}
		return fn(tx)
	})
}

func checkCode(tx *gorm.DB, code, exceptID string) error {
	q := tx.Model(&models.ERPProdMachineCatalog{}).Where(`LOWER(TRIM("MachineCode")) = LOWER(?)`, strings.TrimSpace(code))
	if exceptID != "" {
		q = q.Where(`"IdSeq" <> ?`, exceptID)
	}
	var count int64
	if err := q.Count(&count).Error; err != nil {
		return err
	}
	if count != 0 {
		return conflict("Mã máy đã tồn tại trong hệ thống: " + code)
	}
	return nil
}
