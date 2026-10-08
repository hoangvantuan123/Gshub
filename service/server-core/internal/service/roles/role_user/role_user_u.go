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

// RoleUsersU cập nhật phân quyền User / Menu / RootMenu
func (s *RoleUsersService) RoleUsersU(ctx context.Context, roles []domain.ERPRolesUsers) ([]domain.ERPRolesUsers, error) {
	if len(roles) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsUpdate))
	}
	if err := config.ValidateBatchLimit(len(roles), "cập nhật", "ROLE_USER"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `UPDATE "_ERPRolesUsers" SET 
				"GroupId" = :GroupId, 
				"UserId" = :UserId, 
				"UserSeq" = :UserSeq, 
				"MenuId" = :MenuId, 
				"RootMenuId" = :RootMenuId, 
				"Type" = :Type, 
				"View" = :View, 
				"Edit" = :Edit, 
				"Create" = :Create, 
				"Delete" = :Delete, 
				"UpdatedBy" = :UpdatedBy, 
				"UpdatedAt" = NOW(), 
				"IdxNo" = :IdxNo 
			  WHERE "Id" = :Id
			  RETURNING "Id", "GroupId", "UserId", "UserSeq", "MenuId", "RootMenuId", "Type", "View", "Edit", "Create", "Delete", "UpdatedBy", "UpdatedAt", "IdxNo"`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	updatedRoles := make([]domain.ERPRolesUsers, 0, len(roles))
	for _, r := range roles {
		if r.Id == "" {
			return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgInvalidID, r.Id)
		}

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

		var updatedRole domain.ERPRolesUsers
		err = stmt.GetContext(ctx, &updatedRole, r)
		if err != nil {
			return nil, fmt.Errorf("failed to update role user ID %v: %w", r.Id, err)
		}
		updatedRoles = append(updatedRoles, updatedRole)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.GetCache().DeletePrefix(ctx, "role_users_q:")
	s.publishKafkaEvent("ROLE_USER_UPDATED", updatedRoles)

	return updatedRoles, nil
}
