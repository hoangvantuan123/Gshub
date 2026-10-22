package prod_machine_registration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	models "service-datahub/models/report"
)

const MaxBatchSize = 1000

type APIError struct {
	Status  int
	Message string
}

func (e *APIError) Error() string { return e.Message }

type Result struct {
	Success  bool                 `json:"success"`
	Data     interface{}          `json:"data"`
	PageInfo *models.PlanPageInfo `json:"pageInfo,omitempty"`
}

type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

func invalid(message string) error { return &APIError{Status: 400, Message: message} }

func (s *Service) Execute(ctx context.Context, operation string, body []byte, userID string) (*Result, error) {
	result := &Result{Success: true}
	if operation == "Q" {
		var raw map[string]interface{}
		if len(bytes.TrimSpace(body)) > 0 {
			if err := json.Unmarshal(body, &raw); err != nil || raw == nil {
				return nil, invalid("Bộ lọc phải là JSON object")
			}
		}
		filters := make(map[string]string)
		for key, value := range raw {
			if value != nil {
				filters[key] = fmt.Sprint(value)
			}
		}
		rows, page, err := s.query(ctx, filters)
		if err != nil {
			return nil, err
		}
		result.Data, result.PageInfo = rows, page
		return result, nil
	}
	if userID == "" {
		return nil, &APIError{Status: 401, Message: "Cần đăng nhập để đăng ký báo cáo máy"}
	}
	if operation == "D" {
		var payload struct {
			IdSeqs []string `json:"idSeqs"`
		}
		if err := json.Unmarshal(body, &payload); err != nil || len(payload.IdSeqs) == 0 {
			return nil, invalid("Danh sách dòng cần xóa không hợp lệ")
		}
		res := s.db.WithContext(ctx).
			Where(`"IdSeq" IN ? AND "TKSXRegCode" IS NOT NULL`, payload.IdSeqs).
			Delete(&models.ERPMachineComparisonDetail{})
		if res.Error != nil {
			return nil, res.Error
		}
		result.Data = map[string]int64{"deletedCount": res.RowsAffected}
		return result, nil
	}
	if operation != "A" {
		return nil, invalid("Thao tác không hợp lệ")
	}
	var payload struct {
		TKSXRegCode   string                              `json:"TKSXRegCode"`
		TKSXMasterSeq string                              `json:"TKSXMasterSeq"`
		Items         []models.ERPMachineComparisonDetail `json:"items"`
		Data          []models.ERPMachineComparisonDetail `json:"data"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, invalid("Dữ liệu đăng ký máy không hợp lệ")
	}
	if len(payload.Items) == 0 {
		payload.Items = payload.Data
	}
	code := strings.TrimSpace(payload.TKSXRegCode)
	if code == "" && len(payload.Items) > 0 && payload.Items[0].TKSXRegCode != nil {
		code = strings.TrimSpace(*payload.Items[0].TKSXRegCode)
	}
	if code == "" || len(payload.Items) == 0 || len(payload.Items) > MaxBatchSize {
		return nil, invalid("Cần mã báo cáo TKSX và từ 1 đến 1000 dòng phiếu thống kê")
	}
	tksxMasterSeq := strings.TrimSpace(payload.TKSXMasterSeq)
	if tksxMasterSeq == "" {
		return nil, invalid("Thiếu MasterSeq của báo cáo TKSX")
	}
	var tksxMaster models.ERPPlanMaster
	if err := s.db.WithContext(ctx).
		Where(`"IdSeq" = ? AND "RegCode" = ? AND LOWER("ReportType") IN ('statistics', 'tksx')`, tksxMasterSeq, code).
		First(&tksxMaster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, invalid("Mã báo cáo TKSX hoặc MasterSeq không tồn tại")
		}
		return nil, err
	}
	validatedMasters := make(map[string]bool)
	now := time.Now()
	for i := range payload.Items {
		row := &payload.Items[i]
		row.MasterSeq = strings.TrimSpace(row.MasterSeq)
		row.RegCode = strings.TrimSpace(row.RegCode)
		if row.MasterSeq == "" || row.RegCode == "" {
			return nil, invalid(fmt.Sprintf("Dòng %d thiếu mã báo cáo KHSX hoặc MasterSeq", i+1))
		}
		masterKey := row.MasterSeq + "|" + row.RegCode
		if !validatedMasters[masterKey] {
			var linkedMaster models.ERPPlanMaster
			if err := s.db.WithContext(ctx).
				Where(`"IdSeq" = ? AND "RegCode" = ? AND LOWER("ReportType") IN ('plan', 'statistics', 'tksx')`, row.MasterSeq, row.RegCode).
				First(&linkedMaster).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					return nil, invalid(fmt.Sprintf("Dòng %d không khớp với báo cáo KHSX/TKSX nguồn", i+1))
				}
				return nil, err
			}
			validatedMasters[masterKey] = true
		}
		if row.StatSlipNo == nil || strings.TrimSpace(*row.StatSlipNo) == "" {
			return nil, invalid(fmt.Sprintf("Dòng %d chưa có số phiếu thống kê", i+1))
		}
		if row.SourceRow < 1 {
			return nil, invalid(fmt.Sprintf("Dòng %d chưa có số dòng nguồn hợp lệ", i+1))
		}
		row.TKSXRegCode = &code
		if strings.TrimSpace(row.RegCode) == "" {
			row.RegCode = code
		}
		if row.IdSeq == "" {
			id, err := uuid.NewV7()
			if err != nil {
				return nil, err
			}
			row.IdSeq = id.String()
		}
		row.RowVersion = 1
		row.IsActive = true
		row.CreatedBy, row.UpdatedBy = &userID, &userID
		row.CreatedAt, row.UpdatedAt = &now, &now
	}
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`LOCK TABLE "_ERPMachineComparisonDetail" IN SHARE ROW EXCLUSIVE MODE`).Error; err != nil {
			return err
		}
		for _, row := range payload.Items {
			query := tx.Model(&models.ERPMachineComparisonDetail{}).
				Where(`"TKSXRegCode" = ? AND "SourceRow" = ?`, code, row.SourceRow)
			if row.StatSlipNo != nil {
				query = query.Where(`"StatSlipNo" = ?`, *row.StatSlipNo)
			}
			var existing models.ERPMachineComparisonDetail
			err := query.First(&existing).Error
			if err == nil {
				row.IdSeq = existing.IdSeq
				row.CreatedBy, row.CreatedByName, row.CreatedAt = existing.CreatedBy, existing.CreatedByName, existing.CreatedAt
				row.RowVersion = existing.RowVersion + 1
				if err := tx.Model(&existing).Select("*").Omit("IdSeq", "CreatedBy", "CreatedByName", "CreatedAt").Updates(row).Error; err != nil {
					return err
				}
			} else if err == gorm.ErrRecordNotFound {
				if err := tx.Create(&row).Error; err != nil {
					return err
				}
			} else {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	result.Data = payload.Items
	return result, nil
}

func (s *Service) query(ctx context.Context, filters map[string]string) ([]models.ERPMachineComparisonDetail, *models.PlanPageInfo, error) {
	query := s.db.WithContext(ctx).Model(&models.ERPMachineComparisonDetail{})
	if code := strings.TrimSpace(filters["TKSXRegCode"]); code != "" {
		query = query.Where(`"TKSXRegCode" = ?`, code)
	}
	if slip := strings.TrimSpace(filters["StatSlipNo"]); slip != "" {
		query = query.Where(`"StatSlipNo" ILIKE ?`, "%"+slip+"%")
	}
	page, pageSize := 1, 500
	if value := filters["page"]; value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 1 {
			return nil, nil, invalid("Trang truy vấn không hợp lệ")
		}
		page = parsed
	}
	if value := filters["pageSize"]; value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 1 {
			return nil, nil, invalid("Kích thước trang không hợp lệ")
		}
		pageSize = parsed
	}
	if pageSize > 1000 {
		pageSize = 1000
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, nil, err
	}
	rows := make([]models.ERPMachineComparisonDetail, 0)
	if err := query.Order(`"TKSXRegCode" DESC, "RowSeq" ASC, "SourceRow" ASC`).
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, nil, err
	}
	return rows, &models.PlanPageInfo{
		Page: page, PageSize: pageSize, Total: total, TotalRows: int(total),
		TotalPages:  max(1, int((total+int64(pageSize)-1)/int64(pageSize))),
		LoadedCount: len(rows), TotalColumns: 14,
	}, nil
}
