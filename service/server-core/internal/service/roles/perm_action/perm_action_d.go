package perm_action

import (
	"context"
	"fmt"
	"strings"

	"server-core/internal/constants"
	domainRoles "server-core/internal/models/roles"
	domainSys "server-core/internal/models/system"
	"server-core/internal/platform/cache"

	"github.com/lib/pq"
)

// PermActionsD - Xóa hành động quyền hạn (Kiểm tra khóa ngoại bảng liên kết + OCC RowVersion)
func (s *PermActionsService) PermActionsD(ctx context.Context, actions []domainRoles.ERPPermActions) (any, error) {
	if len(actions) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if len(actions) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng xóa vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(actions))
	}

	var idSeqs []string
	versionMap := make(map[string]int64, len(actions))

	for _, a := range actions {
		if strings.TrimSpace(a.IdSeq) != "" {
			idSeqs = append(idSeqs, a.IdSeq)
			versionMap[a.IdSeq] = a.RowVersion
		}
	}
	if len(idSeqs) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgInvalidID, actions)
	}

	// ── BƯỚC 1: KIỂM TRA OPTIMISTIC CONCURRENCY LOCKING (ROWVERSION) ──
	type ExistingDeleteRecord struct {
		IdSeq         string `db:"IdSeq"`
		ActionName    string `db:"ActionName"`
		RowVersion    int64  `db:"RowVersion"`
		UpdatedByName string `db:"UpdatedByName"`
	}
	var existingList []ExistingDeleteRecord
	queryCheck := `
		SELECT a."IdSeq", a."ActionName", COALESCE(a."RowVersion", 1) AS "RowVersion",
		       COALESCE(u."UserName", u."UserId", CAST(a."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName"
		FROM "_ERPPermActions" a
		LEFT JOIN "_ERPUsers" u ON CAST(a."UpdatedBy" AS VARCHAR) = CAST(u."UserSeq" AS VARCHAR) OR CAST(a."UpdatedBy" AS VARCHAR) = CAST(u."UserId" AS VARCHAR)
		WHERE a."IdSeq" = ANY($1)
	`
	err := s.db.SelectContext(ctx, &existingList, queryCheck, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("lỗi kiểm tra dữ liệu xóa PermActions: %w", err)
	}

	var conflictErrors []domainSys.RowErrorDetail
	for idx, rec := range existingList {
		clientVer, hasVer := versionMap[rec.IdSeq]
		if hasVer && (rec.RowVersion != 0 || clientVer != 0) && rec.RowVersion != clientVer {
			updatedByName := rec.UpdatedByName
			if updatedByName == "" {
				updatedByName = "người dùng khác"
			}

			conflictErrors = append(conflictErrors, domainSys.RowErrorDetail{
				Id:      rec.IdSeq,
				IdxNo:   idx + 1,
				Label:   rec.ActionName,
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
		return nil, &domainSys.BatchSaveError{
			Message: errMsg,
			Details: conflictErrors,
		}
	}

	// ── BƯỚC 2: THỰC THI BATCH DELETE ──
	res, err := s.db.ExecContext(ctx, `DELETE FROM "_ERPPermActions" WHERE "IdSeq" = ANY($1)`, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("failed to delete perm actions: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	s.totalAllCount.Add(-rowsAffected)

	cache.GetCache().DeletePrefix(ctx, "perm_actions_q:")
	s.PublishKafkaEvent("PERM_ACTION_DELETED", idSeqs)

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   idSeqs,
	}, nil
}
