package role_user

import (
	"context"
	"errors"
	"github.com/jmoiron/sqlx"
	domain "server-core/internal/models/roles"
	"strings"
)

// Reject stale catalogue IDs rather than saving actions against deleted menus.
func validateActionAssignment(ctx context.Context, tx *sqlx.Tx, role *domain.ERPRolesUsers) error {
	if role.Type == nil || !strings.EqualFold(strings.TrimSpace(*role.Type), "action") {
		return nil
	}
	if role.MenuId == nil || strings.TrimSpace(*role.MenuId) == "" || role.Name == nil || strings.TrimSpace(*role.Name) == "" {
		return errors.New("quyền thao tác cần menu và mã hành động hợp lệ")
	}
	var exists bool
	if err := tx.GetContext(ctx, &exists, `SELECT EXISTS (SELECT 1 FROM "_ERPMenus" WHERE "Id"=$1 AND LOWER("Type") IN ('menu','menuitem'))`, *role.MenuId); err != nil {
		return err
	}
	if !exists {
		return errors.New("menu gán quyền thao tác không tồn tại hoặc không phải màn hình")
	}
	name := strings.ToUpper(strings.TrimSpace(*role.Name))
	role.Name = &name
	return nil
}
