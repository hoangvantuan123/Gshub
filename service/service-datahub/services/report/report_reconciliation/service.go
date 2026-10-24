package report_reconciliation

import (
	"context"
	"errors"
	"fmt"
	"strings"

	reportmodels "service-datahub/models/report"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	ReportPlan       = "plan"
	ReportStatistics = "statistics"
	writeBatchSize   = 400
)

var ErrConcurrentUpdate = errors.New("nhật trình đã được người khác cập nhật; hãy tải lại rồi lưu lại")

type Service struct{ db *gorm.DB }

func New(db *gorm.DB) *Service { return &Service{db: db} }

type UpdateInput struct {
	DetailIdSeq   string
	RemarkTypeSeq string
	RemarkContent string
	RowVersion    int64
}

// Annotation is the lightweight API view used by the audit modal.
type Annotation struct {
	IdSeq         string `json:"IdSeq"`
	MasterSeq     string `json:"MasterSeq"`
	RegCode       string `json:"RegCode"`
	StatTicketNo  string `json:"StatTicketNo,omitempty"`
	RemarkTypeSeq string `json:"RemarkTypeSeq"`
	RemarkContent string `json:"RemarkContent"`
	RowVersion    int64  `json:"RowVersion"`
}

type sourceIdentity struct {
	IdSeq        string `gorm:"column:IdSeq"`
	MasterSeq    string `gorm:"column:MasterSeq"`
	RegCode      string `gorm:"column:RegCode"`
	StatTicketNo string `gorm:"column:StatTicketNo"`
}

func normalizeReportType(reportType string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(reportType)) {
	case ReportPlan:
		return ReportPlan, nil
	case ReportStatistics, "stat", "tksx":
		return ReportStatistics, nil
	default:
		return "", fmt.Errorf("loại báo cáo đối soát không hợp lệ: %q", reportType)
	}
}

// Query only reads the small indexed reconciliation table. It never scans or
// recalculates production report details.
func (s *Service) Query(ctx context.Context, reportType, masterSeq, regCode string) ([]Annotation, error) {
	typ, err := normalizeReportType(reportType)
	if err != nil {
		return nil, err
	}
	masterSeq = strings.TrimSpace(masterSeq)
	regCode = strings.TrimSpace(regCode)
	if masterSeq == "" && regCode == "" {
		return nil, errors.New("cần MasterSeq hoặc RegCode để truy vấn nhật trình")
	}

	query := s.db.WithContext(ctx).Model(&reportmodels.ERPReportReconciliation{}).Where(`"ReportType" = ?`, typ)
	if masterSeq != "" {
		// MasterSeq is the stable registration identity. RegCode may come from a
		// stale report cache or be a display key, so do not require both values.
		query = query.Where(`"MasterSeq" = ?`, masterSeq)
	} else {
		query = query.Where(`"RegCode" = ?`, regCode)
	}

	var rows []reportmodels.ERPReportReconciliation
	if err := query.Order(`"DetailIdSeq"`).Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]Annotation, 0, len(rows))
	for _, row := range rows {
		result = append(result, Annotation{
			IdSeq: row.DetailIdSeq, MasterSeq: row.MasterSeq, RegCode: row.RegCode,
			StatTicketNo: row.StatTicketNo, RemarkTypeSeq: row.RemarkTypeSeq,
			RemarkContent: row.RemarkContent, RowVersion: row.RowVersion,
		})
	}
	return result, nil
}

// Save writes note edits atomically and uses optimistic concurrency per detail
// row. A stale editor cannot silently overwrite a newer user's work.
func (s *Service) Save(ctx context.Context, reportType string, inputs []UpdateInput, updatedBy string) ([]Annotation, error) {
	typ, err := normalizeReportType(reportType)
	if err != nil {
		return nil, err
	}
	if len(inputs) == 0 {
		return []Annotation{}, nil
	}
	if strings.TrimSpace(updatedBy) == "" {
		updatedBy = "SystemAdmin"
	}

	seen := make(map[string]struct{}, len(inputs))
	ids := make([]string, 0, len(inputs))
	for index := range inputs {
		input := inputs[index]
		id := strings.TrimSpace(input.DetailIdSeq)
		if id == "" {
			return nil, errors.New("thiếu IdSeq chi tiết nhật trình")
		}
		if input.RowVersion < 0 {
			return nil, fmt.Errorf("RowVersion không hợp lệ cho dòng %s", id)
		}
		if _, exists := seen[id]; exists {
			return nil, fmt.Errorf("IdSeq %s bị lặp trong cùng yêu cầu lưu", id)
		}
		seen[id] = struct{}{}
		inputs[index].DetailIdSeq = id
		ids = append(ids, id)
	}

	var saved []Annotation
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		table := `"_ERPPlanDetail"`
		selectColumns := `"IdSeq", "MasterSeq", "RegCode", '' AS "StatTicketNo"`
		if typ == ReportStatistics {
			table = `"_ERPProdStatsDetail"`
			selectColumns = `"IdSeq", "MasterSeq", "RegCode", COALESCE("StatTicketNo", '') AS "StatTicketNo"`
		}
		sources := make(map[string]sourceIdentity, len(inputs))
		for start := 0; start < len(ids); start += writeBatchSize {
			end := start + writeBatchSize
			if end > len(ids) {
				end = len(ids)
			}
			var rows []sourceIdentity
			if err := tx.Table(table).Select(selectColumns).Clauses(clause.Locking{Strength: "KEY SHARE"}).Where(`"IdSeq" IN ?`, ids[start:end]).Find(&rows).Error; err != nil {
				return err
			}
			for _, row := range rows {
				sources[row.IdSeq] = row
			}
		}
		if len(sources) != len(inputs) {
			return errors.New("một hoặc nhiều dòng nhật trình không còn tồn tại trong đăng ký đã chọn")
		}

		for start := 0; start < len(inputs); start += writeBatchSize {
			end := start + writeBatchSize
			if end > len(inputs) {
				end = len(inputs)
			}
			if err := upsertBatch(tx, typ, inputs[start:end], sources, updatedBy); err != nil {
				return err
			}
		}

		var rows []reportmodels.ERPReportReconciliation
		if err := tx.Where(`"ReportType" = ? AND "DetailIdSeq" IN ?`, typ, ids).Order(`"DetailIdSeq"`).Find(&rows).Error; err != nil {
			return err
		}
		saved = make([]Annotation, 0, len(rows))
		for _, row := range rows {
			saved = append(saved, Annotation{
				IdSeq: row.DetailIdSeq, MasterSeq: row.MasterSeq, RegCode: row.RegCode,
				StatTicketNo: row.StatTicketNo, RemarkTypeSeq: row.RemarkTypeSeq,
				RemarkContent: row.RemarkContent, RowVersion: row.RowVersion,
			})
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return saved, nil
}

func upsertBatch(tx *gorm.DB, reportType string, inputs []UpdateInput, sources map[string]sourceIdentity, updatedBy string) error {
	const valuesPerRow = 9
	values := make([]string, 0, len(inputs))
	args := make([]interface{}, 0, len(inputs)*valuesPerRow)
	for _, input := range inputs {
		source := sources[input.DetailIdSeq]
		values = append(values, "(?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
		args = append(args, reportType, input.DetailIdSeq, source.MasterSeq, source.RegCode,
			source.StatTicketNo, input.RemarkTypeSeq, input.RemarkContent, input.RowVersion+1, updatedBy)
	}
	query := `INSERT INTO "_ERPReportReconciliation"
		("ReportType", "DetailIdSeq", "MasterSeq", "RegCode", "StatTicketNo", "RemarkTypeSeq", "RemarkContent", "RowVersion", "UpdatedBy", "CreatedAt", "UpdatedAt")
		VALUES ` + strings.Join(values, ",") + `
		ON CONFLICT ("ReportType", "DetailIdSeq") DO UPDATE SET
			"MasterSeq" = EXCLUDED."MasterSeq",
			"RegCode" = EXCLUDED."RegCode",
			"StatTicketNo" = EXCLUDED."StatTicketNo",
			"RemarkTypeSeq" = EXCLUDED."RemarkTypeSeq",
			"RemarkContent" = EXCLUDED."RemarkContent",
			"RowVersion" = EXCLUDED."RowVersion",
			"UpdatedBy" = EXCLUDED."UpdatedBy",
			"UpdatedAt" = CURRENT_TIMESTAMP
		WHERE "_ERPReportReconciliation"."RowVersion" = EXCLUDED."RowVersion" - 1`
	result := tx.Exec(query, args...)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != int64(len(inputs)) {
		return ErrConcurrentUpdate
	}
	return nil
}
