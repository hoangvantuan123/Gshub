package perm_field

import (
	"context"
	"fmt"
	"strings"

	domainRoles "server-core/internal/models/roles"
	domainSys "server-core/internal/models/system"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// PermFieldsD - Xóa hàng loạt trường phân quyền dữ liệu (Batch Delete with OCC Check)
func (s *PermFieldsService) PermFieldsD(ctx context.Context, fields []domainRoles.ERPPermFields) (int64, error) {
	if len(fields) == 0 {
		return 0, nil
	}

	maxLimit := s.GetMaxBatchSaveLimit()
	if maxLimit > 0 && len(fields) > maxLimit {
		return 0, fmt.Errorf("số lượng bản ghi xóa vượt quá giới hạn cho phép (tối đa %d dòng một lần)", maxLimit)
	}

	var errorDetails []domainSys.RowErrorDetail
	idSeqs := make([]string, 0, len(fields))

	for i, f := range fields {
		rowNum := i + 1
		idSeq := strings.TrimSpace(f.IdSeq)
		if idSeq == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "IdSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã IdSeq không được để trống khi xóa", rowNum),
			})
		} else {
			idSeqs = append(idSeqs, idSeq)
		}
	}

	if len(errorDetails) > 0 {
		return 0, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// Kiểm tra OCC
	type RowCheck struct {
		IdSeq      string `db:"IdSeq"`
		RowVersion int64  `db:"RowVersion"`
	}
	var existingRows []RowCheck
	checkQuery := `SELECT "IdSeq", "RowVersion" FROM "_ERPPermFields" WHERE "IdSeq" = ANY($1)`
	err := s.db.SelectContext(ctx, &existingRows, checkQuery, pq.Array(idSeqs))
	if err != nil {
		return 0, fmt.Errorf("lỗi kiểm tra bản ghi trước khi xóa: %w", err)
	}

	dbRowMap := make(map[string]int64, len(existingRows))
	for _, row := range existingRows {
		dbRowMap[row.IdSeq] = row.RowVersion
	}

	for i, f := range fields {
		rowNum := i + 1
		idSeq := strings.TrimSpace(f.IdSeq)
		expectedVer, exists := dbRowMap[idSeq]
		if !exists {
			continue
		}
		if f.RowVersion > 0 && f.RowVersion != expectedVer {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "RowVersion",
				Type:    "CONCURRENCY_CONFLICT",
				Message: fmt.Sprintf("Dòng %d: Dữ liệu đã bị thay đổi bởi người dùng khác (Phiên bản DB: %d, Phiên bản gửi lên: %d)", rowNum, expectedVer, f.RowVersion),
			})
		}
	}

	if len(errorDetails) > 0 {
		return 0, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi xung đột phiên bản", len(errorDetails)),
			Details: errorDetails,
		}
	}

	deleteQuery := `DELETE FROM "_ERPPermFields" WHERE "IdSeq" = ANY($1)`
	res, err := s.db.ExecContext(ctx, deleteQuery, pq.Array(idSeqs))
	if err != nil {
		if s.log != nil {
			s.log.Error("[PermFieldsD] Delete failed", zap.Error(err))
		}
		return 0, fmt.Errorf("xóa dữ liệu trường phân quyền thất bại: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	s.totalAllCount.Add(-rowsAffected)
	s.PublishKafkaEvent("PERM_FIELDS_D", map[string]interface{}{"deletedIds": idSeqs, "count": rowsAffected})

	return rowsAffected, nil
}
