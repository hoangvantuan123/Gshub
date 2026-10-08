package sys_attr_group

import (
	"context"
	"fmt"
	"strings"

	"server-core/internal/constants"
	domain "server-core/internal/models/system"
	"server-core/internal/platform/cache"

	"github.com/lib/pq"
)

// SysAttrGroupsD - Xóa nhóm thuộc tính chuẩn hóa theo chuẩn RootMenu (Kiểm tra khóa ngoại bảng con + OCC RowVersion)
func (s *SysAttrGroupsService) SysAttrGroupsD(ctx context.Context, groups []domain.ERPSysAttrGroups) (any, error) {
	if len(groups) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if len(groups) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng xóa vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(groups))
	}

	var idSeqs []string
	versionMap := make(map[string]int64, len(groups))

	for _, g := range groups {
		if strings.TrimSpace(g.IdSeq) != "" {
			idSeqs = append(idSeqs, g.IdSeq)
			versionMap[g.IdSeq] = g.RowVersion
		}
	}
	if len(idSeqs) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgInvalidID, groups)
	}

	// ── BƯỚC 1: KIỂM TRA RÀNG BUỘC KHÓA NGOẠI BẢNG CON (_ERPSysAttrItems) ──
	var childCount int
	err := s.db.GetContext(ctx, &childCount, `SELECT COUNT(*) FROM "_ERPSysAttrItems" WHERE "AttrGroupSeq" = ANY($1)`, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("failed to check child constraint for sys attr groups deletion: %w", err)
	}
	if childCount > 0 {
		return nil, constants.NewError(constants.CodeDeleteConflict, "Không thể xóa nhóm thuộc tính vì đang có %d giá trị thuộc tính con liên kết", childCount)
	}

	// ── BƯỚC 2: KIỂM TRA OPTIMISTIC CONCURRENCY LOCKING (ROWVERSION) ──
	type ExistingDeleteRecord struct {
		IdSeq         string  `db:"IdSeq"`
		GroupName     *string `db:"GroupName"`
		RowVersion    int64   `db:"RowVersion"`
		UpdatedByName string  `db:"UpdatedByName"`
	}
	var existingList []ExistingDeleteRecord
	queryCheck := `
		SELECT g."IdSeq", g."GroupName", COALESCE(g."RowVersion", 1) AS "RowVersion",
		       COALESCE(u."UserName", u."UserId", CAST(g."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName"
		FROM "_ERPSysAttrGroups" g
		LEFT JOIN "_ERPUsers" u ON CAST(g."UpdatedBy" AS VARCHAR) = CAST(u."UserSeq" AS VARCHAR) OR CAST(g."UpdatedBy" AS VARCHAR) = CAST(u."UserId" AS VARCHAR)
		WHERE g."IdSeq" = ANY($1)
	`
	err = s.db.SelectContext(ctx, &existingList, queryCheck, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("lỗi kiểm tra dữ liệu xóa SysAttrGroups: %w", err)
	}

	var conflictErrors []domain.RowErrorDetail
	for idx, rec := range existingList {
		clientVer, hasVer := versionMap[rec.IdSeq]
		if hasVer && (rec.RowVersion != 0 || clientVer != 0) && rec.RowVersion != clientVer {
			updatedByName := rec.UpdatedByName
			if updatedByName == "" {
				updatedByName = "người dùng khác"
			}
			gName := ""
			if rec.GroupName != nil {
				gName = *rec.GroupName
			}

			conflictErrors = append(conflictErrors, domain.RowErrorDetail{
				Id:      rec.IdSeq,
				IdxNo:   idx + 1,
				Label:   gName,
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

	// ── BƯỚC 3: THỰC THI BATCH DELETE ──
	res, err := s.db.ExecContext(ctx, `DELETE FROM "_ERPSysAttrGroups" WHERE "IdSeq" = ANY($1)`, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("failed to delete sys attr groups: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	s.totalAllCount.Add(-rowsAffected)

	cache.GetCache().DeletePrefix(ctx, "sys_attr_groups_q:")
	s.PublishKafkaEvent("SYS_ATTR_GROUP_DELETED", idSeqs)

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   idSeqs,
	}, nil
}
