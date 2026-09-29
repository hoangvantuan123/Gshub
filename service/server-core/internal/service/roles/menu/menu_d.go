package menu

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"server-core/internal/constants"
	domain "server-core/internal/models/roles"
	"server-core/internal/platform/cache"

	"github.com/lib/pq"
)

func (s *MenusService) MenuD(ctx context.Context, menus []domain.ERPMenus) (any, error) {
	if len(menus) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if len(menus) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng xóa vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(menus))
	}

	var intIds []int64
	versionMap := make(map[int64]int64, len(menus))

	for _, m := range menus {
		idVal, _ := strconv.ParseInt(fmt.Sprintf("%v", m.Id), 10, 64)
		if idVal > 0 {
			intIds = append(intIds, idVal)
			versionMap[idVal] = m.RowVersion
		}
	}
	if len(intIds) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgInvalidID, menus)
	}

	// ── BƯỚC 1: KIỂM TRA RÀNG BUỘC MENU CON (SUBMENU PARENT CONSTRAINT) ──
	var childCount int
	err := s.db.GetContext(ctx, &childCount, `SELECT COUNT(*) FROM "_ERPMenus" WHERE "MenuSubRootId" = ANY($1)`, pq.Array(intIds))
	if err != nil {
		return nil, fmt.Errorf("failed to check constraint for menu deletion: %w", err)
	}
	if childCount > 0 {
		return nil, constants.NewError(constants.CodeDeleteConflict, constants.MsgDeleteConflictMenus, childCount)
	}

	// ── BƯỚC 2: KIỂM TRA OPTIMISTIC CONCURRENCY LOCKING (ROWVERSION) ──
	type ExistingDeleteRecord struct {
		Id            int64   `db:"Id"`
		Label         *string `db:"Label"`
		RowVersion    int64   `db:"RowVersion"`
		UpdatedByName string  `db:"UpdatedByName"`
	}
	var existingList []ExistingDeleteRecord
	queryCheck := `
		SELECT m."Id", m."Label", COALESCE(m."RowVersion", 0) AS "RowVersion",
		       COALESCE(u."UserName", u."UserId", CAST(m."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName"
		FROM "_ERPMenus" m
		LEFT JOIN "_ERPUsers" u ON CAST(m."UpdatedBy" AS VARCHAR) = CAST(u."UserSeq" AS VARCHAR) OR CAST(m."UpdatedBy" AS VARCHAR) = CAST(u."UserId" AS VARCHAR)
		WHERE m."Id" = ANY($1)
	`
	err = s.db.SelectContext(ctx, &existingList, queryCheck, pq.Array(intIds))
	if err != nil {
		return nil, fmt.Errorf("lỗi kiểm tra dữ liệu xóa Menu: %w", err)
	}

	var conflictErrors []domain.RowErrorDetail
	for idx, rec := range existingList {
		clientVer, hasVer := versionMap[rec.Id]
		if hasVer && (rec.RowVersion != 0 || clientVer != 0) && rec.RowVersion != clientVer {
			updatedByName := rec.UpdatedByName
			if updatedByName == "" {
				updatedByName = "người dùng khác"
			}
			labelStr := ""
			if rec.Label != nil {
				labelStr = *rec.Label
			}

			conflictErrors = append(conflictErrors, domain.RowErrorDetail{
				Id:      rec.Id,
				IdxNo:   idx + 1,
				Label:   labelStr,
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

	// ── BƯỚC 3: THỰC HIỆN XÓA AN TOÀN TRONG TRANSACTION ──
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Tự động xóa các phân quyền liên quan trong _ERPRolesUsers để tránh rác DB và tránh kẹt xóa
	_, err = tx.ExecContext(ctx, `DELETE FROM "_ERPRolesUsers" WHERE "MenuId" = ANY($1)`, pq.Array(intIds))
	if err != nil {
		return nil, fmt.Errorf("failed to delete related role permissions: %w", err)
	}

	// Xóa menu
	res, err := tx.ExecContext(ctx, `DELETE FROM "_ERPMenus" WHERE "Id" = ANY($1)`, pq.Array(intIds))
	if err != nil {
		return nil, fmt.Errorf("failed to delete menus: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.totalAllCount.Add(-rowsAffected)
	cache.GetCache().DeletePrefix(ctx, "menu_q:")
	s.PublishKafkaEvent("MENU_DELETED", intIds)

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   intIds,
	}, nil
}
