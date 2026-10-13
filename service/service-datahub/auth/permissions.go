package auth

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"
)

type PermissionGrant struct {
	MenuID int64  `gorm:"column:MenuId"`
	Type   string `gorm:"column:Type"`
	Name   string `gorm:"column:Name"`
	View   bool   `gorm:"column:View"`
	Create bool   `gorm:"column:Create"`
	Edit   bool   `gorm:"column:Edit"`
	Delete bool   `gorm:"column:Delete"`
	Import bool   `gorm:"column:Import"`
	Export bool   `gorm:"column:Export"`
}

// Combine group grants per menu; explicit Search/Save declarations override fallback.
func GrantsAllow(grants []PermissionGrant, operation string) bool {
	byMenu := map[int64][]PermissionGrant{}
	for _, grant := range grants {
		byMenu[grant.MenuID] = append(byMenu[grant.MenuID], grant)
	}
	for _, rows := range byMenu {
		flags := map[string]bool{}
		actions := map[string]bool{}
		for _, row := range rows {
			switch strings.ToLower(row.Type) {
			case "menu", "submenu", "menuitem":
				for key, value := range map[string]bool{"VIEW": row.View, "CREATE": row.Create, "EDIT": row.Edit, "DELETE": row.Delete, "IMPORT": row.Import, "EXPORT": row.Export} {
					flags[key] = flags[key] || value
				}
			case "action":
				name := strings.TrimPrefix(strings.ToUpper(strings.TrimSpace(row.Name)), "BTN_")
				actions[name] = actions[name] || row.View
			}
		}
		allowed := func(key string) bool { return flags[key] || actions[key] }
		if !allowed("VIEW") {
			continue
		}
		op := strings.ToUpper(operation)
		if op == "SEARCH" {
			if value, exists := actions["SEARCH"]; !exists || value {
				return true
			}
			continue
		}
		if op == "SAVE" {
			if value, exists := actions["SAVE"]; exists {
				if value && (allowed("CREATE") || allowed("EDIT")) {
					return true
				}
			} else if allowed("CREATE") || allowed("EDIT") {
				return true
			}
			continue
		}
		if !allowed(op) {
			continue
		}
		if op == "CREATE" || op == "EDIT" {
			if value, exists := actions["SAVE"]; exists && !value {
				continue
			}
		}
		return true
	}
	return false
}

func CheckMenuPermission(ctx context.Context, db *gorm.DB, user *AuthenticatedUser, keys []string, operation string) (bool, error) {
	if user == nil || user.UserSeq == "" {
		return false, errors.New("missing authenticated user identity")
	}
	if db == nil {
		return false, errors.New("permission store unavailable")
	}
	var grants []PermissionGrant
	err := db.WithContext(ctx).Raw(`SELECT r."MenuId", r."Type", r."Name", r."View", r."Create", r."Edit", r."Delete", r."Import", r."Export"
        FROM "_ERPRolesUsers" r JOIN "_ERPMenus" m ON m."Id"=r."MenuId"
        WHERE LOWER(TRIM(m."Key")) IN ? AND r."GroupId" IN (
            SELECT "GroupId" FROM "_ERPRolesUsers" WHERE "Type"='user' AND "UserSeq"::text=?
        )`, keys, user.UserSeq).Scan(&grants).Error
	if err != nil {
		return false, err
	}
	return GrantsAllow(grants, operation), nil
}

type authenticatedUserKey struct{}

func WithAuthenticatedUser(ctx context.Context, user *AuthenticatedUser) context.Context {
	return context.WithValue(ctx, authenticatedUserKey{}, user)
}

func AuthenticatedUserFromContext(ctx context.Context) *AuthenticatedUser {
	user, _ := ctx.Value(authenticatedUserKey{}).(*AuthenticatedUser)
	return user
}
