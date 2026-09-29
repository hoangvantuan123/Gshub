package role_group

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"server-core/internal/config"
	"server-core/internal/constants"
	domain "server-core/internal/models/roles"
	"server-core/internal/platform/cache"

	"github.com/lib/pq"
)

// RoleGroupU cập nhật nhóm quyền với Optimistic Locking
func (s *RoleGroupService) RoleGroupU(ctx context.Context, groups []domain.ERPGroups) ([]domain.ERPGroups, error) {
	if len(groups) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsUpdate))
	}
	if err := config.ValidateBatchLimit(len(groups), "cập nhật", "ROLE_GROUP"); err != nil {
		return nil, err
	}

	// ── BƯỚC 1: PRE-VALIDATION IN-MEMORY (O(N)) ──
	idTracker := make(map[string]int, len(groups))
	var errorDetails []domain.RowErrorDetail

	for idx, g := range groups {
		rowNum := idx + 1
		if g.IdxNo != nil && *g.IdxNo > 0 {
			rowNum = *g.IdxNo
		}
		if g.Id == "" || g.Id == "0" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Field:   "Id",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Thiếu ID định danh nhóm quyền", rowNum),
			})
			continue
		}
		if g.Name == nil || strings.TrimSpace(*g.Name) == "" {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Id:      g.Id,
				Field:   "Name",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Tên nhóm quyền không được để trống", rowNum),
			})
			continue
		}

		if firstRow, exists := idTracker[g.Id]; exists {
			errorDetails = append(errorDetails, domain.RowErrorDetail{
				IdxNo:   rowNum,
				Id:      g.Id,
				Field:   "Id",
				Type:    "DUPLICATE",
				Message: fmt.Sprintf("Dòng %d: ID '%v' bị trùng lặp với dòng %d", rowNum, g.Id, firstRow),
			})
			continue
		}
		idTracker[g.Id] = rowNum
	}

	if len(errorDetails) > 0 {
		return nil, &domain.BatchSaveError{
			Message: fmt.Sprintf("Có %d dòng dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// ── BƯỚC 2: CHỐNG DEADLOCK BẰNG CÁCH SẮP XẾP ID TĂNG DẦN ──
	sort.Slice(groups, func(i, j int) bool {
		idI, _ := strconv.ParseInt(groups[i].Id, 10, 64)
		idJ, _ := strconv.ParseInt(groups[j].Id, 10, 64)
		return idI < idJ
	})

	// ── BƯỚC 3: MỞ TRANSACTION & PRE-CHECK ROWVERSION (OCC) ──
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	ids := make([]int64, 0, len(groups))
	for _, g := range groups {
		idVal, _ := strconv.ParseInt(g.Id, 10, 64)
		ids = append(ids, idVal)
	}

	type ExistingRecord struct {
		Id            int64      `db:"Id"`
		Name          *string    `db:"Name"`
		RowVersion    int64      `db:"RowVersion"`
		UpdatedAt     *time.Time `db:"UpdatedAt"`
		UpdatedByName string     `db:"UpdatedByName"`
	}

	var existingList []ExistingRecord
	queryCheck := `
		SELECT g."Id", g."Name", COALESCE(g."RowVersion", 0) AS "RowVersion", g."UpdatedAt",
		       COALESCE(u."UserName", u."UserId", CAST(g."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName"
		FROM "_ERPGroups" g
		LEFT JOIN "_ERPUsers" u ON CAST(g."UpdatedBy" AS VARCHAR) = CAST(u."UserSeq" AS VARCHAR) OR CAST(g."UpdatedBy" AS VARCHAR) = CAST(u."UserId" AS VARCHAR)
		WHERE g."Id" = ANY($1)
	`
	err = tx.SelectContext(ctx, &existingList, queryCheck, pq.Array(ids))
	if err != nil {
		return nil, fmt.Errorf("lỗi kiểm tra dữ liệu hiện hành Nhóm quyền: %w", err)
	}

	existingMap := make(map[int64]ExistingRecord, len(existingList))
	for _, rec := range existingList {
		existingMap[rec.Id] = rec
	}

	var conflictErrors []domain.RowErrorDetail
	for idx, g := range groups {
		rowNum := idx + 1
		if g.IdxNo != nil && *g.IdxNo > 0 {
			rowNum = *g.IdxNo
		}
		idVal, _ := strconv.ParseInt(g.Id, 10, 64)
		existing, found := existingMap[idVal]
		if !found {
			conflictErrors = append(conflictErrors, domain.RowErrorDetail{
				Id:      g.Id,
				IdxNo:   rowNum,
				Type:    "NOT_FOUND",
				Message: fmt.Sprintf("Dòng %d: Nhóm quyền không tồn tại hoặc đã bị xóa", rowNum),
			})
			continue
		}

		if (existing.RowVersion != 0 || g.RowVersion != 0) && existing.RowVersion != g.RowVersion {
			updatedByName := existing.UpdatedByName
			if updatedByName == "" {
				updatedByName = "người dùng khác"
			}
			nameStr := ""
			if existing.Name != nil {
				nameStr = *existing.Name
			}

			msg := fmt.Sprintf("Dòng %d (Nhóm '%s'): Người dùng [%s] đã chỉnh sửa trước đó", rowNum, nameStr, updatedByName)
			if existing.RowVersion > g.RowVersion {
				msg = fmt.Sprintf("Dòng %d (Nhóm '%s'): Người dùng [%s] đã cập nhật phiên bản mới hơn trên hệ thống", rowNum, nameStr, updatedByName)
			}

			conflictErrors = append(conflictErrors, domain.RowErrorDetail{
				Id:      g.Id,
				IdxNo:   rowNum,
				Label:   nameStr,
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
		}
		return nil, &domain.BatchSaveError{
			Message: errMsg,
			Details: conflictErrors,
		}
	}

	// ── BƯỚC 4: THỰC HIỆN CẬP NHẬT VÀ TĂNG ROWVERSION ──
	query := `WITH updated AS (
		UPDATE "_ERPGroups" SET 
			"Name" = :Name, 
			"Comment" = :Comment, 
			"IdxNo" = :IdxNo, 
			"RowVersion" = COALESCE(CAST(NULLIF(CAST("RowVersion" AS VARCHAR), '') AS BIGINT), 0) + 1,
			"UpdatedBy" = :UpdatedBy, 
			"UpdatedAt" = NOW() 
		WHERE CAST("Id" AS VARCHAR) = CAST(:Id AS VARCHAR)
		RETURNING *
	)
	SELECT 
		g."Id", g."Name", g."Comment", g."IdxNo", 
		COALESCE(CAST(NULLIF(CAST(g."RowVersion" AS VARCHAR), '') AS BIGINT), 1) AS "RowVersion",
		g."CreatedBy",
		COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(g."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
		g."CreatedAt",
		g."UpdatedBy",
		COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(g."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
		g."UpdatedAt"
	FROM updated g
	LEFT JOIN "_ERPUsers" uc ON CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(g."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
	LEFT JOIN "_ERPUsers" uu ON CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(g."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	updatedGroups := make([]domain.ERPGroups, 0, len(groups))
	for _, g := range groups {
		var updatedGroup domain.ERPGroups
		err = stmt.GetContext(ctx, &updatedGroup, g)
		if err != nil {
			return nil, fmt.Errorf("failed to update group ID %v: %w", g.Id, err)
		}
		updatedGroups = append(updatedGroups, updatedGroup)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.GetCache().DeletePrefix(ctx, "role_group_q:")
	s.publishKafkaEvent("ROLE_GROUP_UPDATED", updatedGroups)

	return updatedGroups, nil
}
