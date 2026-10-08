package sys_attr_item

import (
	"context"
	"fmt"
	"strings"

	"server-core/internal/constants"
	domain "server-core/internal/models/system"
	"server-core/internal/platform/cache"

	"github.com/lib/pq"
)

// SysAttrItemsD - Xóa chi tiết thuộc tính chuẩn hóa theo chuẩn RootMenu (OCC RowVersion)
func (s *SysAttrItemsService) SysAttrItemsD(ctx context.Context, items []domain.ERPSysAttrItems) (any, error) {
	if len(items) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if len(items) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng xóa vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(items))
	}

	var idSeqs []string
	versionMap := make(map[string]int64, len(items))

	for _, it := range items {
		if strings.TrimSpace(it.IdSeq) != "" {
			idSeqs = append(idSeqs, it.IdSeq)
			versionMap[it.IdSeq] = it.RowVersion
		}
	}
	if len(idSeqs) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgInvalidID, items)
	}

	// ── BƯỚC 1: KIỂM TRA OPTIMISTIC CONCURRENCY LOCKING (ROWVERSION) ──
	type ExistingDeleteRecord struct {
		IdSeq         string  `db:"IdSeq"`
		AttrValueName *string `db:"AttrValueName"`
		RowVersion    int64   `db:"RowVersion"`
		UpdatedByName string  `db:"UpdatedByName"`
	}
	var existingList []ExistingDeleteRecord
	queryCheck := `
		SELECT i."IdSeq", i."AttrValueName", COALESCE(i."RowVersion", 1) AS "RowVersion",
		       COALESCE(u."UserName", u."UserId", CAST(i."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName"
		FROM "_ERPSysAttrItems" i
		LEFT JOIN "_ERPUsers" u ON CAST(i."UpdatedBy" AS VARCHAR) = CAST(u."UserSeq" AS VARCHAR) OR CAST(i."UpdatedBy" AS VARCHAR) = CAST(u."UserId" AS VARCHAR)
		WHERE i."IdSeq" = ANY($1)
	`
	err := s.db.SelectContext(ctx, &existingList, queryCheck, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("lỗi kiểm tra dữ liệu xóa SysAttrItems: %w", err)
	}

	var conflictErrors []domain.RowErrorDetail
	for idx, rec := range existingList {
		clientVer, hasVer := versionMap[rec.IdSeq]
		if hasVer && (rec.RowVersion != 0 || clientVer != 0) && rec.RowVersion != clientVer {
			updatedByName := rec.UpdatedByName
			if updatedByName == "" {
				updatedByName = "người dùng khác"
			}
			vName := ""
			if rec.AttrValueName != nil {
				vName = *rec.AttrValueName
			}

			conflictErrors = append(conflictErrors, domain.RowErrorDetail{
				Id:      rec.IdSeq,
				IdxNo:   idx + 1,
				Label:   vName,
				Field:   "RowVersion",
				Type:    "CONFLICT",
				Message: fmt.Sprintf("Dòng %d: Người dùng [%s] đã cập nhật phiên bản mới hơn, không thể xóa!", idx+1, updatedByName),
			})
		}
	}

	if len(conflictErrors) > 0 {
		errMsg := fmt.Sprintf("Phát hiện %d dòng dữ liệu bị xung đột phiên bản, không thể xóa!", len(conflictErrors))
		if len(conflictErrors) == 1 {
			errMsg = conflictErrors[0].Message
		} else if len(conflictErrors) <= 3 {
			var msgs []string
			for _, ce := range conflictErrors {
				msgs = append(msgs, ce.Message)
			}
			errMsg = strings.Join(msgs, " | ")
		}
		return nil, &domain.BatchSaveError{
			Message: errMsg,
			Details: conflictErrors,
		}
	}

	// ── BƯỚC 2: THỰC THI BATCH DELETE ──
	res, err := s.db.ExecContext(ctx, `DELETE FROM "_ERPSysAttrItems" WHERE "IdSeq" = ANY($1)`, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("failed to delete sys attr items: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	s.totalAllCount.Add(-rowsAffected)

	cache.GetCache().DeletePrefix(ctx, "sys_attr_items_q:")
	s.PublishKafkaEvent("SYS_ATTR_ITEM_DELETED", idSeqs)

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   idSeqs,
	}, nil
}
