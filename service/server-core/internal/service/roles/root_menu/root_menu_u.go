package root_menu

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"server-core/internal/constants"
	domain "server-core/internal/models/roles"
	"server-core/internal/platform/cache"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// RootMenuU: CẬP NHẬT ROOT MENU (Chống Deadlock + Row-Level OCC bằng RowVersion + CTE Bulk Update JOIN Audit User Info)
func (s *RootMenusService) RootMenuU(ctx context.Context, menus []domain.ERPRootMenus) ([]domain.ERPRootMenus, error) {
	if len(menus) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsUpdate))
	}
	if len(menus) > s.GetMaxBatchSaveLimit() {
		return nil, fmt.Errorf("số lượng dòng cập nhật vượt quá giới hạn tối đa %d dòng/lần (gửi lên %d dòng)", s.GetMaxBatchSaveLimit(), len(menus))
	}

	// ── BƯỚC 1: PRE-VALIDATION IN-MEMORY (O(N)) ──
	keyTracker := make(map[string]int, len(menus))
	idTracker := make(map[string]int, len(menus))
	var errorDetails []domain.RowErrorDetail

	for idx, m := range menus {
		rowNum := idx + 1
		if m.IdxNo != nil && *m.IdxNo > 0 {
			rowNum = *m.IdxNo
		}
		if m.Id == nil || fmt.Sprintf("%v", m.Id) == "" || fmt.Sprintf("%v", m.Id) == "0" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "Id",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Thiếu ID định danh bản ghi", rowNum),
			})
			continue
		}
		if m.Key == nil || strings.TrimSpace(*m.Key) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "Key",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã Key không được để trống", rowNum),
			})
			continue
		}
		if m.Label == nil || strings.TrimSpace(*m.Label) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     *m.Key,
				Field:   "Label",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d (Key '%s'): Tên nhãn (Label) không được để trống", rowNum, *m.Key),
			})
			continue
		}

		keyClean := strings.ToLower(strings.TrimSpace(*m.Key))
		if firstRow, exists := keyTracker[keyClean]; exists {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     *m.Key,
				Field:   "Key",
				Type:    "DUPLICATE",
				Message: fmt.Sprintf("Dòng %d: Mã Key '%s' bị trùng với dòng %d", rowNum, *m.Key, firstRow),
			})
			continue
		}
		keyTracker[keyClean] = rowNum

		idStr := fmt.Sprintf("%v", m.Id)
		if firstRow, exists := idTracker[idStr]; exists {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Id:      m.Id,
				Field:   "Id",
				Type:    "DUPLICATE",
				Message: fmt.Sprintf("Dòng %d: ID '%v' bị trùng lặp với dòng %d", rowNum, m.Id, firstRow),
			})
			continue
		}
		idTracker[idStr] = rowNum
	}

	if len(errorDetails) > 0 {
		return nil, &domain.BatchSaveError{
			Message: fmt.Sprintf("Có %d dòng dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// ── BƯỚC 2: CHỐNG DEADLOCK BẰNG CÁCH SẮP XẾP ID TĂNG DẦN ──
	sort.Slice(menus, func(i, j int) bool {
		idI, _ := strconv.ParseInt(fmt.Sprintf("%v", menus[i].Id), 10, 64)
		idJ, _ := strconv.ParseInt(fmt.Sprintf("%v", menus[j].Id), 10, 64)
		return idI < idJ
	})

	// ── BƯỚC 3: MỞ TRANSACTION & BATCH PRE-CHECK OPTIMISTIC LOCKING BẰNG ROWVERSION ──
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	ids := make([]int64, 0, len(menus))
	for _, m := range menus {
		idVal, _ := strconv.ParseInt(fmt.Sprintf("%v", m.Id), 10, 64)
		ids = append(ids, idVal)
	}

	type ExistingRecord struct {
		Id            int64      `db:"Id"`
		Key           *string    `db:"Key"`
		Label         *string    `db:"Label"`
		RowVersion    int64      `db:"RowVersion"`
		UpdatedAt     *time.Time `db:"UpdatedAt"`
		UpdatedByName string     `db:"UpdatedByName"`
	}

	var existingList []ExistingRecord
	queryCheck := `
		SELECT rm."Id", rm."Key", rm."Label", COALESCE(rm."RowVersion", 0) AS "RowVersion", rm."UpdatedAt",
		       COALESCE(u."UserName", u."UserId", rm."UpdatedBy", '') AS "UpdatedByName"
		FROM "_ERPRootMenus" rm
		LEFT JOIN "_ERPUsers" u ON CAST(rm."UpdatedBy" AS VARCHAR) = CAST(u."UserSeq" AS VARCHAR) OR CAST(rm."UpdatedBy" AS VARCHAR) = CAST(u."UserId" AS VARCHAR)
		WHERE rm."Id" = ANY($1)
	`
	err = tx.SelectContext(ctx, &existingList, queryCheck, pq.Array(ids))
	if err != nil {
		return nil, fmt.Errorf("lỗi kiểm tra dữ liệu hiện hành: %w", err)
	}

	existingMap := make(map[int64]ExistingRecord, len(existingList))
	for _, rec := range existingList {
		existingMap[rec.Id] = rec
	}

	// Đối chiếu kiểm tra xung đột từng dòng (Row-level Concurrency via RowVersion)
	var conflictErrors []domain.RowErrorDetail
	for idx, m := range menus {
		rowNum := idx + 1
		if m.IdxNo != nil && *m.IdxNo > 0 {
			rowNum = *m.IdxNo
		}
		idVal, _ := strconv.ParseInt(fmt.Sprintf("%v", m.Id), 10, 64)
		existing, found := existingMap[idVal]
		if !found {
			conflictErrors = append(conflictErrors, domain.RowErrorDetail{
				Id:      m.Id,
				IdxNo:   rowNum,
				Type:    "NOT_FOUND",
				Message: fmt.Sprintf("Dòng %d: Bản ghi không tồn tại hoặc đã bị xóa", rowNum),
			})
			continue
		}

		// Kiểm tra xung đột RowVersion
		if s.log != nil {
			s.log.Info("[RootMenuU OCC Check]",
				zap.Int64("row_id", idVal),
				zap.Int64("db_row_version", existing.RowVersion),
				zap.Int64("client_row_version", m.RowVersion),
			)
		}
		if (existing.RowVersion != 0 || m.RowVersion != 0) && existing.RowVersion != m.RowVersion {
			updatedByName := existing.UpdatedByName
			if updatedByName == "" {
				updatedByName = "người dùng khác"
			}
			labelStr := ""
			if existing.Label != nil {
				labelStr = *existing.Label
			}
			keyStr := ""
			if existing.Key != nil {
				keyStr = *existing.Key
			}

			msg := fmt.Sprintf("Dòng %d: Người dùng [%s] đã chỉnh sửa trước đó", rowNum, updatedByName)
			if existing.RowVersion > m.RowVersion {
				msg = fmt.Sprintf("Dòng %d: Người dùng [%s] đã cập nhật phiên bản mới hơn", rowNum, updatedByName)
			}

			conflictErrors = append(conflictErrors, domain.RowErrorDetail{
				Id:      m.Id,
				IdxNo:   rowNum,
				Key:     keyStr,
				Label:   labelStr,
				Field:   "RowVersion",
				Type:    "CONFLICT",
				Message: msg,
			})
		}
	}

	if len(conflictErrors) > 0 {
		errMsg := fmt.Sprintf("Phát hiện %d dòng dữ liệu đã có phiên bản mới hơn trên hệ thống", len(conflictErrors))
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

	// ── BƯỚC 4: 1-QUERY ATOMIC BULK UPDATE BẰNG CTE KÈM LEFT JOIN _ERPUsers ──
	n := len(menus)
	arrIds := make([]int64, n)
	arrKeys := make([]string, n)
	arrIdxNos := make([]int, n)
	arrLabels := make([]string, n)
	arrIcons := make([]string, n)
	arrLinks := make([]string, n)
	arrUtilities := make([]bool, n)
	arrRowVersions := make([]int64, n)
	arrUpdatedBy := make([]string, n)

	for i, m := range menus {
		arrIds[i] = ids[i]
		if m.Key != nil {
			arrKeys[i] = *m.Key
		}
		if m.IdxNo != nil {
			arrIdxNos[i] = *m.IdxNo
		} else {
			arrIdxNos[i] = i + 1
		}
		if m.Label != nil {
			arrLabels[i] = *m.Label
		}
		if m.Icon != nil {
			arrIcons[i] = *m.Icon
		}
		if m.Link != nil {
			arrLinks[i] = *m.Link
		}
		arrUtilities[i] = m.Utilities
		arrRowVersions[i] = existingMap[ids[i]].RowVersion + 1
		arrUpdatedBy[i] = fmt.Sprintf("%v", m.UpdatedBy)
	}

	bulkUpdateSQL := `
		WITH updated AS (
			UPDATE "_ERPRootMenus" AS target
			SET 
				"Key"        = data.k,
				"IdxNo"      = data.idx,
				"Label"      = data.lbl,
				"Icon"       = data.ico,
				"Link"       = data.lnk,
				"Utilities"  = data.util,
				"RowVersion" = data.ver,
				"UpdatedBy"  = data.ub,
				"UpdatedAt"  = NOW()
			FROM (
				SELECT * FROM UNNEST(
					$1::bigint[], $2::text[], $3::int[], $4::text[], $5::text[], $6::text[], $7::boolean[], $8::bigint[], $9::text[]
				) AS t(id, k, idx, lbl, ico, lnk, util, ver, ub)
			) AS data
			WHERE target."Id" = data.id
			RETURNING target.*
		)
		SELECT 
			rm."Id", rm."Key", rm."IdxNo", rm."Label", rm."Icon", rm."Link", 
			COALESCE(rm."Utilities", false) AS "Utilities",
			COALESCE(rm."RowVersion", 0) AS "RowVersion",
			rm."CreatedBy",
			COALESCE(uc."UserName", uc."UserId", rm."CreatedBy", '') AS "CreatedByName",
			rm."CreatedAt",
			rm."UpdatedBy",
			COALESCE(uu."UserName", uu."UserId", rm."UpdatedBy", '') AS "UpdatedByName",
			rm."UpdatedAt"
		FROM updated rm
		LEFT JOIN "_ERPUsers" uc ON CAST(rm."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(rm."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(rm."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(rm."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		ORDER BY rm."IdxNo" ASC, rm."Id" ASC
	`

	var updatedRecords []domain.ERPRootMenus
	err = tx.SelectContext(ctx, &updatedRecords, bulkUpdateSQL,
		pq.Array(arrIds),
		pq.Array(arrKeys),
		pq.Array(arrIdxNos),
		pq.Array(arrLabels),
		pq.Array(arrIcons),
		pq.Array(arrLinks),
		pq.Array(arrUtilities),
		pq.Array(arrRowVersions),
		pq.Array(arrUpdatedBy),
	)
	if err != nil {
		return nil, fmt.Errorf("lỗi thực thi Bulk Update: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.GetCache().DeletePrefix(ctx, "root_menu_q:")
	s.PublishKafkaEvent("ROOT_MENU_UPDATED", updatedRecords)

	return updatedRecords, nil
}
