package role_group

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	"server-core/internal/platform/cache"

	"github.com/lib/pq"
)

// RoleGroupD xóa nhóm quyền theo danh sách Id
// - Nếu nhóm vẫn còn quyền đang được tích (Menu/Action hợp lệ) hoặc còn Người dùng liên kết -> CHẶN XÓA để bảo vệ dữ liệu.
// - Nếu nhóm đã được gỡ hết quyền (chỉ còn rác mồ côi hoặc không còn quyền) -> Tự động dọn dẹp và CHO PHÉP XÓA.
func (s *RoleGroupService) RoleGroupD(ctx context.Context, ids []string) (any, error) {
	if len(ids) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if err := config.ValidateBatchLimit(len(ids), "xóa", "ROLE_GROUP"); err != nil {
		return nil, err
	}

	// 1. Kiểm tra xem có nhóm nào vẫn còn quyền đang được tích hoặc còn người dùng gán vào không
	for _, id := range ids {
		var activeCount int
		checkQuery := `
			SELECT COUNT(*) FROM "_ERPRolesUsers" ru
			WHERE CAST(ru."GroupId" AS VARCHAR) = $1
			  AND (
			    -- Còn tài khoản người dùng đang thuộc nhóm này
			    (ru."Type" = 'user' AND ((ru."UserId" IS NOT NULL AND ru."UserId" != '') OR (ru."UserSeq" IS NOT NULL AND ru."UserSeq" != '')))
			    OR
			    -- Còn quyền RootMenu hợp lệ đang được bật (tích chọn)
			    (ru."Type" IN ('root', 'rootmenu') 
			     AND ru."RootMenuId" IN (SELECT "Id" FROM "_ERPRootMenus") 
			     AND (ru."View" = true OR ru."Edit" = true OR ru."Create" = true OR ru."Delete" = true))
			    OR
			    -- Còn quyền Menu hợp lệ đang được bật (tích chọn)
			    (ru."Type" IN ('menu', 'submenu') 
			     AND ru."MenuId" IN (SELECT "Id" FROM "_ERPMenus") 
			     AND (ru."View" = true OR ru."Edit" = true OR ru."Create" = true OR ru."Delete" = true))
			    OR
			    -- Còn quyền Action hợp lệ trên menu đang tồn tại
			    (ru."Type" = 'action' 
			     AND ru."MenuId" IN (SELECT "Id" FROM "_ERPMenus") 
			     AND (ru."View" = true OR ru."Edit" = true OR ru."Create" = true OR ru."Delete" = true))
			  )
		`
		err := s.db.GetContext(ctx, &activeCount, checkQuery, id)
		if err != nil {
			return nil, fmt.Errorf("failed to check active permissions for group ID %v: %w", id, err)
		}
		if activeCount > 0 {
			return nil, constants.NewError(
				constants.CodeDeleteConflict,
				"Không thể xóa: Nhóm quyền này vẫn đang có %d quyền hoặc người dùng liên kết. Vui lòng hủy các quyền đã tích trước khi xóa.",
				activeCount,
			)
		}
	}

	// 2. Khi nhóm đã được gỡ hết quyền hợp lệ: bắt đầu transaction để dọn sạch các bản ghi mồ côi và xóa nhóm
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Dọn dẹp toàn bộ dữ liệu phụ thuộc còn sót lại (bao gồm các action mồ côi trỏ menu không tồn tại)
	_, err = tx.ExecContext(ctx, `DELETE FROM "_ERPRolesUsers" WHERE CAST("GroupId" AS VARCHAR) = ANY($1)`, pq.Array(ids))
	if err != nil {
		return nil, fmt.Errorf("failed to clean up remaining role records: %w", err)
	}

	// Xóa nhóm quyền trong _ERPGroups
	res, err := tx.ExecContext(ctx, `DELETE FROM "_ERPGroups" WHERE CAST("Id" AS VARCHAR) = ANY($1)`, pq.Array(ids))
	if err != nil {
		return nil, fmt.Errorf("failed to delete groups: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit delete transaction: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()

	cache.GetCache().DeletePrefix(ctx, "role_group_q:")
	cache.GetCache().DeletePrefix(ctx, "role_users_q:")
	cache.GetCache().DeletePrefix(ctx, "role_q:")
	cache.GetCache().DeletePrefix(ctx, "auth_perm:")
	cache.GetCache().DeletePrefix(ctx, "user_perm:")

	s.publishKafkaEvent("ROLE_GROUP_DELETED", ids)

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   ids,
	}, nil
}
