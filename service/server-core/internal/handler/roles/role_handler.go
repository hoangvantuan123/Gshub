package roles

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	domain "server-core/internal/models/roles"
	roleGroupSvc "server-core/internal/service/roles/role_group"
	roleUserSvc "server-core/internal/service/roles/role_user"
	"server-core/internal/utils"
	pb_role "server-core/proto/users/roles/role"

	"go.uber.org/zap"
)

type RoleHandler struct {
	pb_role.UnimplementedRoleServiceServer
	roleGroupSvc *roleGroupSvc.RoleGroupService
	roleUsersSvc *roleUserSvc.RoleUsersService
	log          *zap.Logger
}

func NewRoleHandler(
	roleGroup *roleGroupSvc.RoleGroupService,
	roleUsers *roleUserSvc.RoleUsersService,
	log *zap.Logger,
) *RoleHandler {
	return &RoleHandler{
		roleGroupSvc: roleGroup,
		roleUsersSvc: roleUsers,
		log:          log,
	}
}

// ─── UNIFIED ROLE SERVICE HANDLERS (1 A, 1 U, 1 D, 1 Q) ───

func (h *RoleHandler) RoleQ(ctx context.Context, req *pb_role.RoleQRequest) (*pb_role.Response, error) {
	filters := make(map[string]string)
	if req.Result != nil {
		for k, v := range req.Result {
			if v != "" {
				filters[k] = v
			}
		}
	}
	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" && !strings.EqualFold(k, "authorization") {
				filters[k] = v
			}
		}
	}

	sheet := ""
	groupId := 0
	for k, v := range filters {
		if strings.EqualFold(k, "Sheet") || strings.EqualFold(k, "Type") || strings.EqualFold(k, "Target") {
			sheet = strings.ToLower(v)
		}
		if strings.EqualFold(k, "GroupId") || strings.EqualFold(k, "KeyItem1") {
			if id, err := strconv.Atoi(v); err == nil {
				groupId = id
			}
		}
	}

	if sheet == "all" || sheet == "details" || (sheet == "" && groupId > 0) {
		rootmenuRoles, err := h.roleUsersSvc.RoleUsersQ(ctx, roleUserSvc.RoleUsersQueryOptions{Type: "rootmenu", GroupId: groupId})
		if err != nil {
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		menuRoles, err := h.roleUsersSvc.RoleUsersQ(ctx, roleUserSvc.RoleUsersQueryOptions{Type: "menu", GroupId: groupId})
		if err != nil {
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		userRoles, err := h.roleUsersSvc.RoleUsersQ(ctx, roleUserSvc.RoleUsersQueryOptions{Type: "user", GroupId: groupId})
		if err != nil {
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}

		result := map[string]interface{}{
			"rootmenu": rootmenuRoles,
			"menu":     menuRoles,
			"user":     userRoles,
		}
		return utils.SuccessResponse[pb_role.Response]("Truy vấn thành công", result), nil
	}

	switch sheet {
	case "group", "groups", "rolegroup":
		data, err := h.roleGroupSvc.RoleGroupQ(ctx, filters)
		if err != nil {
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		return utils.SuccessResponse[pb_role.Response]("Truy vấn thành công", data), nil

	case "root", "rootmenu", "root_menu", "role_root_menu":
		opts := roleUserSvc.RoleUsersQueryOptions{Type: "rootmenu", GroupId: groupId}
		data, err := h.roleUsersSvc.RoleUsersQ(ctx, opts)
		if err != nil {
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		return utils.SuccessResponse[pb_role.Response]("Truy vấn thành công", data), nil

	case "menu", "role_menu":
		opts := roleUserSvc.RoleUsersQueryOptions{Type: "menu", GroupId: groupId}
		data, err := h.roleUsersSvc.RoleUsersQ(ctx, opts)
		if err != nil {
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		return utils.SuccessResponse[pb_role.Response]("Truy vấn thành công", data), nil

	case "user", "users", "role_user", "role_users":
		opts := roleUserSvc.RoleUsersQueryOptions{Type: "user", GroupId: groupId}
		for k, v := range filters {
			if strings.EqualFold(k, "UserId") || strings.EqualFold(k, "UserSeq") {
				if id, err := strconv.Atoi(v); err == nil {
					opts.UserId = id
				}
			}
		}
		data, err := h.roleUsersSvc.RoleUsersQ(ctx, opts)
		if err != nil {
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		return utils.SuccessResponse[pb_role.Response]("Truy vấn thành công", data), nil

	case "perm_resource_tree", "resource_tree", "menu_tree", "tree":
		data, err := h.roleUsersSvc.PermResourceTreeQ(ctx, filters)
		if err != nil {
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		return utils.SuccessResponse[pb_role.Response]("Truy vấn cây phân hệ thành công", data), nil

	default:
		data, err := h.roleGroupSvc.RoleGroupQ(ctx, filters)
		if err != nil {
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		return utils.SuccessResponse[pb_role.Response]("Truy vấn thành công", data), nil
	}
}

func (h *RoleHandler) RoleA(ctx context.Context, req *pb_role.RoleARequest) (*pb_role.Response, error) {
	userSeq, _ := ctx.Value("user_seq").(string)

	var groups []domain.ERPGroups
	var rolesUsers []domain.ERPRolesUsers

	for _, item := range req.Result {
		sheet := strings.ToLower(item.Sheet)
		itemType := strings.ToLower(item.Type)

		if sheet == "group" || sheet == "groups" || itemType == "group" {
			g := domain.ERPGroups{}
			if userSeq != "" {
				g.CreatedBy = &userSeq
				g.UpdatedBy = &userSeq
			} else {
				if item.CreatedBy != "" {
					val := item.CreatedBy
					g.CreatedBy = &val
				}
				if item.UpdatedBy != "" {
					val := item.UpdatedBy
					g.UpdatedBy = &val
				}
			}
			if item.Name != "" {
				val := item.Name
				g.Name = &val
			}
			if item.Comment != "" {
				val := item.Comment
				g.Comment = &val
			}
			if item.IdxNo != 0 {
				val := int(item.IdxNo)
				g.IdxNo = &val
			}
			g.RowVersion = item.RowVersion
			groups = append(groups, g)
		} else {
			ru := domain.ERPRolesUsers{
				View:       item.View,
				Create:     item.Create,
				Edit:       item.Edit,
				Delete:     item.Delete,
				RowVersion: item.RowVersion,
			}
			if userSeq != "" {
				ru.CreatedBy = &userSeq
				ru.UpdatedBy = &userSeq
			} else {
				if item.CreatedBy != "" {
					val := item.CreatedBy
					ru.CreatedBy = &val
				}
				if item.UpdatedBy != "" {
					val := item.UpdatedBy
					ru.UpdatedBy = &val
				}
			}

			resolvedType := item.Type
			if resolvedType == "" {
				switch sheet {
				case "rootmenu", "root":
					resolvedType = "root"
				case "menu":
					resolvedType = "menu"
				case "user":
					resolvedType = "user"
				}
			}
			if resolvedType != "" {
				ru.Type = &resolvedType
			}

			if item.UserId != "" {
				val := item.UserId
				ru.UserId = &val
			}
			if item.Name != "" {
				val := item.Name
				ru.Name = &val
			}
			if item.GroupId != 0 {
				val := fmt.Sprintf("%v", item.GroupId)
				ru.GroupId = &val
			}
			if item.IdxNo != 0 {
				val := int(item.IdxNo)
				ru.IdxNo = &val
			}
			if item.MenuId != 0 {
				val := fmt.Sprintf("%v", item.MenuId)
				ru.MenuId = &val
			}
			if item.RootMenuId != 0 {
				val := fmt.Sprintf("%v", item.RootMenuId)
				ru.RootMenuId = &val
			}
			if item.UserSeq != "" {
				val := item.UserSeq
				ru.UserSeq = &val
			}
			rolesUsers = append(rolesUsers, ru)
		}
	}

	var results []any

	if len(groups) > 0 {
		savedGroups, err := h.roleGroupSvc.RoleGroupA(ctx, groups)
		if err != nil {
			h.log.Error("RoleA groups failed", zap.Error(err))
			if batchErr, ok := err.(*domain.BatchSaveError); ok {
				return utils.ErrorWithDataResponse[pb_role.Response](batchErr.Message, batchErr.Details), nil
			}
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		results = append(results, savedGroups)
	}

	if len(rolesUsers) > 0 {
		savedRoles, err := h.roleUsersSvc.RoleUsersA(ctx, rolesUsers)
		if err != nil {
			h.log.Error("RoleA roles users failed", zap.Error(err))
			if batchErr, ok := err.(*domain.BatchSaveError); ok {
				return utils.ErrorWithDataResponse[pb_role.Response](batchErr.Message, batchErr.Details), nil
			}
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		results = append(results, savedRoles)
	}

	return utils.SuccessResponse[pb_role.Response]("Thành công", results), nil
}

func (h *RoleHandler) RoleU(ctx context.Context, req *pb_role.RoleURequest) (*pb_role.Response, error) {
	userSeq, _ := ctx.Value("user_seq").(string)

	var groups []domain.ERPGroups
	var rolesUsers []domain.ERPRolesUsers

	for _, item := range req.Result {
		sheet := strings.ToLower(item.Sheet)
		itemType := strings.ToLower(item.Type)

		if sheet == "group" || sheet == "groups" || itemType == "group" {
			g := domain.ERPGroups{
				Id: fmt.Sprintf("%v", item.Id),
			}
			if userSeq != "" {
				g.UpdatedBy = &userSeq
			} else if item.UpdatedBy != "" {
				val := item.UpdatedBy
				g.UpdatedBy = &val
			}
			if item.Name != "" {
				val := item.Name
				g.Name = &val
			}
			if item.Comment != "" {
				val := item.Comment
				g.Comment = &val
			}
			if item.IdxNo != 0 {
				val := int(item.IdxNo)
				g.IdxNo = &val
			}
			g.RowVersion = item.RowVersion
			groups = append(groups, g)
		} else {
			ru := domain.ERPRolesUsers{
				Id:         fmt.Sprintf("%v", item.Id),
				View:       item.View,
				Create:     item.Create,
				Edit:       item.Edit,
				Delete:     item.Delete,
				RowVersion: item.RowVersion,
			}
			if userSeq != "" {
				ru.UpdatedBy = &userSeq
			} else if item.UpdatedBy != "" {
				val := item.UpdatedBy
				ru.UpdatedBy = &val
			}

			resolvedType := item.Type
			if resolvedType == "" {
				switch sheet {
				case "rootmenu", "root":
					resolvedType = "root"
				case "menu":
					resolvedType = "menu"
				case "user":
					resolvedType = "user"
				}
			}
			if resolvedType != "" {
				ru.Type = &resolvedType
			}

			if item.UserId != "" {
				val := item.UserId
				ru.UserId = &val
			}
			if item.Name != "" {
				val := item.Name
				ru.Name = &val
			}
			if item.GroupId != 0 {
				val := fmt.Sprintf("%v", item.GroupId)
				ru.GroupId = &val
			}
			if item.IdxNo != 0 {
				val := int(item.IdxNo)
				ru.IdxNo = &val
			}
			if item.MenuId != 0 {
				val := fmt.Sprintf("%v", item.MenuId)
				ru.MenuId = &val
			}
			if item.RootMenuId != 0 {
				val := fmt.Sprintf("%v", item.RootMenuId)
				ru.RootMenuId = &val
			}
			if item.UserSeq != "" {
				val := item.UserSeq
				ru.UserSeq = &val
			}
			rolesUsers = append(rolesUsers, ru)
		}
	}

	var results []any

	if len(groups) > 0 {
		savedGroups, err := h.roleGroupSvc.RoleGroupU(ctx, groups)
		if err != nil {
			h.log.Error("RoleU groups failed", zap.Error(err))
			if batchErr, ok := err.(*domain.BatchSaveError); ok {
				return utils.ErrorWithDataResponse[pb_role.Response](batchErr.Message, batchErr.Details), nil
			}
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		results = append(results, savedGroups)
	}

	if len(rolesUsers) > 0 {
		savedRoles, err := h.roleUsersSvc.RoleUsersU(ctx, rolesUsers)
		if err != nil {
			h.log.Error("RoleU roles users failed", zap.Error(err))
			if batchErr, ok := err.(*domain.BatchSaveError); ok {
				return utils.ErrorWithDataResponse[pb_role.Response](batchErr.Message, batchErr.Details), nil
			}
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		results = append(results, savedRoles)
	}

	return utils.SuccessResponse[pb_role.Response]("Thành công", results), nil
}

func (h *RoleHandler) RoleD(ctx context.Context, req *pb_role.RoleDRequest) (*pb_role.Response, error) {
	var groupIds []string
	var roleUserIds []string

	for _, item := range req.Result {
		sheet := strings.ToLower(item.Sheet)
		itemType := strings.ToLower(item.Type)

		if sheet == "group" || sheet == "groups" || itemType == "group" {
			groupIds = append(groupIds, fmt.Sprintf("%v", item.Id))
		} else {
			roleUserIds = append(roleUserIds, fmt.Sprintf("%v", item.Id))
		}
	}

	var results []any

	if len(groupIds) > 0 {
		delGroups, err := h.roleGroupSvc.RoleGroupD(ctx, groupIds)
		if err != nil {
			h.log.Error("RoleD groups failed", zap.Error(err))
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		results = append(results, delGroups)
	}

	if len(roleUserIds) > 0 {
		delRoles, err := h.roleUsersSvc.RoleUsersD(ctx, roleUserIds)
		if err != nil {
			h.log.Error("RoleD roles users failed", zap.Error(err))
			return utils.ErrorResponse[pb_role.Response](err.Error()), nil
		}
		results = append(results, delRoles)
	}

	return utils.SuccessResponse[pb_role.Response]("Thành công", results), nil
}

// --- RoleGroupService Handlers ---

func (h *RoleHandler) RoleGroupA(ctx context.Context, req *pb_role.RoleGroupARequest) (*pb_role.Response, error) {
	userSeq, _ := ctx.Value("user_seq").(string)
	var groups []domain.ERPGroups
	for _, item := range req.Result {
		group := domain.ERPGroups{}
		if userSeq != "" {
			group.CreatedBy = &userSeq
			group.UpdatedBy = &userSeq
		} else {
			if item.CreatedBy != "" {
				val := item.CreatedBy
				group.CreatedBy = &val
			}
			if item.UpdatedBy != "" {
				val := item.UpdatedBy
				group.UpdatedBy = &val
			}
		}
		if item.Name != "" {
			val := item.Name
			group.Name = &val
		}
		if item.Comment != "" {
			val := item.Comment
			group.Comment = &val
		}
		if item.IdxNo != 0 {
			val := int(item.IdxNo)
			group.IdxNo = &val
		}
		group.RowVersion = item.RowVersion

		groups = append(groups, group)
	}

	data, err := h.roleGroupSvc.RoleGroupA(ctx, groups)
	if err != nil {
		h.log.Error("RoleGroupA failed", zap.Error(err))
		if batchErr, ok := err.(*domain.BatchSaveError); ok {
			return utils.ErrorWithDataResponse[pb_role.Response](batchErr.Message, batchErr.Details), nil
		}
		return utils.ErrorResponse[pb_role.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_role.Response]("Thành công", data), nil
}

func (h *RoleHandler) RoleGroupU(ctx context.Context, req *pb_role.RoleGroupURequest) (*pb_role.Response, error) {
	userSeq, _ := ctx.Value("user_seq").(string)
	var groups []domain.ERPGroups
	for _, item := range req.Result {
		group := domain.ERPGroups{
			Id: fmt.Sprintf("%v", item.Id),
		}
		if userSeq != "" {
			group.UpdatedBy = &userSeq
		} else if item.UpdatedBy != "" {
			val := item.UpdatedBy
			group.UpdatedBy = &val
		}
		if item.Name != "" {
			val := item.Name
			group.Name = &val
		}
		if item.Comment != "" {
			val := item.Comment
			group.Comment = &val
		}
		if item.IdxNo != 0 {
			val := int(item.IdxNo)
			group.IdxNo = &val
		}
		group.RowVersion = item.RowVersion

		groups = append(groups, group)
	}

	data, err := h.roleGroupSvc.RoleGroupU(ctx, groups)
	if err != nil {
		h.log.Error("RoleGroupU failed", zap.Error(err))
		if batchErr, ok := err.(*domain.BatchSaveError); ok {
			return utils.ErrorWithDataResponse[pb_role.Response](batchErr.Message, batchErr.Details), nil
		}
		return utils.ErrorResponse[pb_role.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_role.Response]("Thành công", data), nil
}

func (h *RoleHandler) RoleGroupD(ctx context.Context, req *pb_role.RoleGroupDRequest) (*pb_role.Response, error) {
	var ids []string
	for _, item := range req.Result {
		ids = append(ids, fmt.Sprintf("%v", item.Id))
	}

	data, err := h.roleGroupSvc.RoleGroupD(ctx, ids)
	if err != nil {
		h.log.Error("RoleGroupD failed", zap.Error(err))
		return utils.ErrorResponse[pb_role.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_role.Response]("Thành công", data), nil
}

func (h *RoleHandler) RoleGroupQ(ctx context.Context, req *pb_role.RoleGroupQRequest) (*pb_role.Response, error) {
	filters := make(map[string]string)
	if req.Result != nil {
		for k, v := range req.Result {
			if v != "" {
				filters[k] = v
			}
		}
	}
	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" && !strings.EqualFold(k, "authorization") {
				filters[k] = v
			}
		}
	}

	data, err := h.roleGroupSvc.RoleGroupQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponse[pb_role.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_role.Response]("Truy vấn thành công", data), nil
}

// --- UserRoleService Handlers ---

func (h *RoleHandler) UserRoleA(ctx context.Context, req *pb_role.UserRoleARequest) (*pb_role.Response, error) {
	userSeq, _ := ctx.Value("user_seq").(string)
	var rolesList []domain.ERPRolesUsers
	for _, item := range req.Result {
		role := domain.ERPRolesUsers{
			View:       item.View,
			Create:     item.Create,
			Edit:       item.Edit,
			Delete:     item.Delete,
			RowVersion: item.RowVersion,
		}

		if userSeq != "" {
			role.CreatedBy = &userSeq
			role.UpdatedBy = &userSeq
		} else {
			if item.CreatedBy != "" {
				val := item.CreatedBy
				role.CreatedBy = &val
			}
			if item.UpdatedBy != "" {
				val := item.UpdatedBy
				role.UpdatedBy = &val
			}
		}

		if item.Type != "" {
			val := item.Type
			role.Type = &val
		}
		if item.UserId != "" {
			val := item.UserId
			role.UserId = &val
		}
		if item.Name != "" {
			val := item.Name
			role.Name = &val
		}
		if item.GroupId != 0 {
			val := fmt.Sprintf("%v", item.GroupId)
			role.GroupId = &val
		}
		if item.IdxNo != 0 {
			val := int(item.IdxNo)
			role.IdxNo = &val
		}
		if item.MenuId != 0 {
			val := fmt.Sprintf("%v", item.MenuId)
			role.MenuId = &val
		}
		if item.RootMenuId != 0 {
			val := fmt.Sprintf("%v", item.RootMenuId)
			role.RootMenuId = &val
		}
		if item.UserSeq != "" {
			val := item.UserSeq
			role.UserSeq = &val
		}

		rolesList = append(rolesList, role)
	}

	data, err := h.roleUsersSvc.RoleUsersA(ctx, rolesList)
	if err != nil {
		h.log.Error("UserRoleA failed", zap.Error(err))
		if batchErr, ok := err.(*domain.BatchSaveError); ok {
			return utils.ErrorWithDataResponse[pb_role.Response](batchErr.Message, batchErr.Details), nil
		}
		return utils.ErrorResponse[pb_role.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_role.Response]("Thành công", data), nil
}

func (h *RoleHandler) UserRoleU(ctx context.Context, req *pb_role.UserRoleURequest) (*pb_role.Response, error) {
	userSeq, _ := ctx.Value("user_seq").(string)
	var rolesList []domain.ERPRolesUsers
	for _, item := range req.Result {
		role := domain.ERPRolesUsers{
			Id:         fmt.Sprintf("%v", item.Id),
			View:       item.View,
			Create:     item.Create,
			Edit:       item.Edit,
			Delete:     item.Delete,
			RowVersion: item.RowVersion,
		}

		if userSeq != "" {
			role.UpdatedBy = &userSeq
		} else if item.UpdatedBy != "" {
			val := item.UpdatedBy
			role.UpdatedBy = &val
		}

		if item.Type != "" {
			val := item.Type
			role.Type = &val
		}
		if item.UserId != "" {
			val := item.UserId
			role.UserId = &val
		}
		if item.Name != "" {
			val := item.Name
			role.Name = &val
		}
		if item.GroupId != 0 {
			val := fmt.Sprintf("%v", item.GroupId)
			role.GroupId = &val
		}
		if item.IdxNo != 0 {
			idx := int(item.IdxNo)
			role.IdxNo = &idx
		}
		if item.MenuId != 0 {
			val := fmt.Sprintf("%v", item.MenuId)
			role.MenuId = &val
		}
		if item.RootMenuId != 0 {
			val := fmt.Sprintf("%v", item.RootMenuId)
			role.RootMenuId = &val
		}
		if item.UserSeq != "" {
			val := item.UserSeq
			role.UserSeq = &val
		}

		rolesList = append(rolesList, role)
	}

	data, err := h.roleUsersSvc.RoleUsersU(ctx, rolesList)
	if err != nil {
		h.log.Error("UserRoleU failed", zap.Error(err))
		if batchErr, ok := err.(*domain.BatchSaveError); ok {
			return utils.ErrorWithDataResponse[pb_role.Response](batchErr.Message, batchErr.Details), nil
		}
		return utils.ErrorResponse[pb_role.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_role.Response]("Thành công", data), nil
}

func (h *RoleHandler) UserRoleD(ctx context.Context, req *pb_role.UserRoleDRequest) (*pb_role.Response, error) {
	var ids []string
	for _, item := range req.Result {
		ids = append(ids, fmt.Sprintf("%v", item.Id))
	}

	data, err := h.roleUsersSvc.RoleUsersD(ctx, ids)
	if err != nil {
		h.log.Error("UserRoleD failed", zap.Error(err))
		return utils.ErrorResponse[pb_role.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_role.Response]("Thành công", data), nil
}

func (h *RoleHandler) UserRoleQ(ctx context.Context, req *pb_role.UserRoleQRequest) (*pb_role.Response, error) {
	filters := make(map[string]string)
	if req.Result != nil {
		for k, v := range req.Result {
			if v != "" {
				filters[k] = v
			}
		}
	}
	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" && !strings.EqualFold(k, "authorization") {
				filters[k] = v
			}
		}
	}

	opts := roleUserSvc.RoleUsersQueryOptions{Type: "user"}
	for k, v := range filters {
		if strings.EqualFold(k, "GroupId") || strings.EqualFold(k, "KeyItem1") {
			if id, err := strconv.Atoi(v); err == nil {
				opts.GroupId = id
			}
		}
		if strings.EqualFold(k, "UserId") || strings.EqualFold(k, "UserSeq") {
			if id, err := strconv.Atoi(v); err == nil {
				opts.UserId = id
			}
		}
	}

	data, err := h.roleUsersSvc.RoleUsersQ(ctx, opts)
	if err != nil {
		return utils.ErrorResponse[pb_role.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_role.Response]("Truy vấn thành công", data), nil
}

func (h *RoleHandler) MenuRoleQ(ctx context.Context, req *pb_role.MenuRoleQRequest) (*pb_role.Response, error) {
	filters := make(map[string]string)
	if req.Result != nil {
		for k, v := range req.Result {
			if v != "" {
				filters[k] = v
			}
		}
	}
	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" && !strings.EqualFold(k, "authorization") {
				filters[k] = v
			}
		}
	}

	opts := roleUserSvc.RoleUsersQueryOptions{Type: "menu"}
	for k, v := range filters {
		if strings.EqualFold(k, "GroupId") || strings.EqualFold(k, "KeyItem1") {
			if id, err := strconv.Atoi(v); err == nil {
				opts.GroupId = id
			}
		}
	}

	data, err := h.roleUsersSvc.RoleUsersQ(ctx, opts)
	if err != nil {
		return utils.ErrorResponse[pb_role.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_role.Response]("Truy vấn thành công", data), nil
}

func (h *RoleHandler) RootMenuRoleQ(ctx context.Context, req *pb_role.RootMenuRoleQRequest) (*pb_role.Response, error) {
	filters := make(map[string]string)
	if req.Result != nil {
		for k, v := range req.Result {
			if v != "" {
				filters[k] = v
			}
		}
	}
	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" && !strings.EqualFold(k, "authorization") {
				filters[k] = v
			}
		}
	}

	opts := roleUserSvc.RoleUsersQueryOptions{Type: "rootmenu"}
	for k, v := range filters {
		if strings.EqualFold(k, "GroupId") || strings.EqualFold(k, "KeyItem1") {
			if id, err := strconv.Atoi(v); err == nil {
				opts.GroupId = id
			}
		}
	}

	data, err := h.roleUsersSvc.RoleUsersQ(ctx, opts)
	if err != nil {
		return utils.ErrorResponse[pb_role.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_role.Response]("Truy vấn thành công", data), nil
}
