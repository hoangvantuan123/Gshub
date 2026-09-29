package role_user

import (
	"context"
	"errors"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	domain "server-core/internal/models/roles"
	"server-core/internal/platform/cache"
)

// RoleUsersA tạo mới phân quyền User / Menu / RootMenu
func (s *RoleUsersService) RoleUsersA(ctx context.Context, roles []domain.ERPRolesUsers) ([]domain.ERPRolesUsers, error) {
	if len(roles) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsInsert))
	}
	if err := config.ValidateBatchLimit(len(roles), "thêm mới", "ROLE_USER"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `INSERT INTO "_ERPRolesUsers" ("GroupId", "UserId", "UserSeq", "MenuId", "RootMenuId", "Type", "View", "Edit", "Create", "Delete", "CreatedBy", "CreatedAt", "IdxNo") 
	          VALUES (:GroupId, :UserId, :UserSeq, :MenuId, :RootMenuId, :Type, :View, :Edit, :Create, :Delete, :CreatedBy, NOW(), :IdxNo) 
			  RETURNING "Id", "GroupId", "UserId", "UserSeq", "MenuId", "RootMenuId", "Type", "View", "Edit", "Create", "Delete", "CreatedBy", "CreatedAt", "IdxNo"`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	newRoles := make([]domain.ERPRolesUsers, 0, len(roles))
	for _, r := range roles {
		if (r.RootMenuId == nil || *r.RootMenuId == "" || *r.RootMenuId == "0") && r.Name != nil && *r.Name != "" {
			var foundId int
			_ = tx.GetContext(ctx, &foundId, `SELECT "Id" FROM "_ERPRootMenus" WHERE LOWER(TRIM("Key")) = LOWER(TRIM($1)) OR LOWER(TRIM("Label")) = LOWER(TRIM($1)) LIMIT 1`, *r.Name)
			if foundId > 0 {
				val := fmt.Sprintf("%d", foundId)
				r.RootMenuId = &val
			}
		}
		if (r.MenuId == nil || *r.MenuId == "" || *r.MenuId == "0") && r.Name != nil && *r.Name != "" {
			var foundId int
			_ = tx.GetContext(ctx, &foundId, `SELECT "Id" FROM "_ERPMenus" WHERE LOWER(TRIM("Key")) = LOWER(TRIM($1)) OR LOWER(TRIM("Label")) = LOWER(TRIM($1)) LIMIT 1`, *r.Name)
			if foundId > 0 {
				val := fmt.Sprintf("%d", foundId)
				r.MenuId = &val
			}
		}
		if (r.UserSeq == nil || *r.UserSeq == "") && r.UserId != nil && *r.UserId != "" {
			var foundUser struct {
				UserSeq string `db:"UserSeq"`
				UserId  string `db:"UserId"`
			}
			_ = tx.GetContext(ctx, &foundUser, `SELECT "UserSeq", "UserId" FROM "_ERPUsers" WHERE LOWER(TRIM("UserId")) = LOWER(TRIM($1)) OR LOWER(TRIM("UserName")) = LOWER(TRIM($1)) LIMIT 1`, *r.UserId)
			if foundUser.UserSeq != "" {
				r.UserSeq = &foundUser.UserSeq
				r.UserId = &foundUser.UserId
			}
		}

		var newRole domain.ERPRolesUsers
		err = stmt.GetContext(ctx, &newRole, r)
		if err != nil {
			return nil, fmt.Errorf("failed to insert role user: %w", err)
		}
		newRoles = append(newRoles, newRole)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.GetCache().DeletePrefix(ctx, "role_users_q:")
	s.publishKafkaEvent("ROLE_USER_CREATED", newRoles)

	return newRoles, nil
}
