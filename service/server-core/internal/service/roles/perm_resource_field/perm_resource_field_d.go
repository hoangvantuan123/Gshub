package perm_resource_field

import (
	"context"
	"fmt"
	"strings"

	domainRoles "server-core/internal/models/roles"
	domainSys "server-core/internal/models/system"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// PermResourceFieldsD - Xóa hàng loạt trường phân quyền theo Menu (Batch Delete with OCC Check)
func (s *PermResourceFieldsService) PermResourceFieldsD(ctx context.Context, fields []domainRoles.ERPPermResourceFields) (int64, error) {
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
	checkQuery := `SELECT "IdSeq", "RowVersion" FROM "_ERPPermResourceFields" WHERE "IdSeq" = ANY($1)`
	err := s.db.SelectContext(ctx, &existingRows, checkQuery, pq.Array(idSeqs))
	if err != nil {
		return 0, fmt.Errorf("kiểm tra bản ghi xóa thất bại: %w", err)
	}

	rowVersionMap := make(map[string]int64, len(existingRows))
	for _, r := range existingRows {
		rowVersionMap[r.IdSeq] = r.RowVersion
	}

	for i, f := range fields {
		rowNum := i + 1
		idSeq := strings.TrimSpace(f.IdSeq)
		currVersion, exists := rowVersionMap[idSeq]
		if !exists {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "IdSeq",
				Type:    "NOT_FOUND",
				Message: fmt.Sprintf("Dòng %d: Bản ghi đã bị xóa hoặc không tồn tại", rowNum),
			})
		} else if f.RowVersion > 0 && currVersion != f.RowVersion {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     idSeq,
				Field:   "RowVersion",
				Type:    "OCC_CONFLICT",
				Message: fmt.Sprintf("Dòng %d: Dữ liệu đã bị người khác thay đổi (phiên bản hiện tại: %d, phiên bản gửi lên: %d)", rowNum, currVersion, f.RowVersion),
			})
		}
	}

	if len(errorDetails) > 0 {
		return 0, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi phiên bản khi xóa dữ liệu", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// Xóa dữ liệu
	deleteQuery := `DELETE FROM "_ERPPermResourceFields" WHERE "IdSeq" = ANY($1)`
	res, err := s.db.ExecContext(ctx, deleteQuery, pq.Array(idSeqs))
	if err != nil {
		return 0, fmt.Errorf("thực thi xóa bản ghi thất bại: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	s.PublishKafkaEvent("DELETED_BATCH", fields)

	if s.log != nil {
		s.log.Info("Batch delete ERPPermResourceFields thành công", zap.Int64("rowsAffected", rowsAffected))
	}

	return rowsAffected, nil
}
