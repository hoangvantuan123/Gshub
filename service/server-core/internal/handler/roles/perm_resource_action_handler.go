package roles

import (
	"context"
	"encoding/json"

	domainRoles "server-core/internal/models/roles"
	"server-core/internal/service/roles/perm_resource_action"
	"server-core/internal/utils"
	pbResActions "server-core/proto/users/roles/perm_resource_actions"
)

type PermResourceActionHandler struct {
	pbResActions.UnimplementedPermResourceActionsServiceServer
	svc *perm_resource_action.PermResourceActionsService
}

func NewPermResourceActionHandler(svc *perm_resource_action.PermResourceActionsService) *PermResourceActionHandler {
	return &PermResourceActionHandler{
		svc: svc,
	}
}

func (h *PermResourceActionHandler) PermResourceActionsA(ctx context.Context, req *pbResActions.PermResourceActionsARequest) (*pbResActions.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbResActions.Response]("Dữ liệu thêm mới không được để trống"), nil
	}

	actions := make([]domainRoles.ERPPermResourceActions, len(req.Result))
	for i, item := range req.Result {
		var customActionName *string
		if item.CustomActionName != "" {
			cName := item.CustomActionName
			customActionName = &cName
		}
		var comment *string
		if item.Comment != "" {
			cmt := item.Comment
			comment = &cmt
		}
		var createdBy *string
		if item.CreatedBy != "" {
			cb := item.CreatedBy
			createdBy = &cb
		}
		var updatedBy *string
		if item.UpdatedBy != "" {
			ub := item.UpdatedBy
			updatedBy = &ub
		}
		var idxNo *int
		if item.IdxNo > 0 {
			idx := int(item.IdxNo)
			idxNo = &idx
		}

		actions[i] = domainRoles.ERPPermResourceActions{
			ResourceSeq:      item.ResourceSeq,
			ActionSeq:        item.ActionSeq,
			CustomActionName: customActionName,
			IsDefaultAllow:   item.IsDefaultAllow,
			OrderNo:          int(item.OrderNo),
			Comment:          comment,
			IdxNo:            idxNo,
			CreatedBy:        createdBy,
			UpdatedBy:        updatedBy,
		}
	}

	data, err := h.svc.PermResourceActionsA(ctx, actions)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResActions.Response](err), nil
	}

	return utils.SuccessResponse[pbResActions.Response]("Thêm mới thành công", data), nil
}

func (h *PermResourceActionHandler) PermResourceActionsU(ctx context.Context, req *pbResActions.PermResourceActionsURequest) (*pbResActions.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbResActions.Response]("Dữ liệu cập nhật không được để trống"), nil
	}

	actions := make([]domainRoles.ERPPermResourceActions, len(req.Result))
	for i, item := range req.Result {
		var customActionName *string
		if item.CustomActionName != "" {
			cName := item.CustomActionName
			customActionName = &cName
		}
		var comment *string
		if item.Comment != "" {
			cmt := item.Comment
			comment = &cmt
		}
		var updatedBy *string
		if item.UpdatedBy != "" {
			ub := item.UpdatedBy
			updatedBy = &ub
		}
		var idxNo *int
		if item.IdxNo > 0 {
			idx := int(item.IdxNo)
			idxNo = &idx
		}

		actions[i] = domainRoles.ERPPermResourceActions{
			IdSeq:            item.IdSeq,
			ResourceSeq:      item.ResourceSeq,
			ActionSeq:        item.ActionSeq,
			CustomActionName: customActionName,
			IsDefaultAllow:   item.IsDefaultAllow,
			OrderNo:          int(item.OrderNo),
			Comment:          comment,
			RowVersion:       item.RowVersion,
			IdxNo:            idxNo,
			UpdatedBy:        updatedBy,
		}
	}

	data, err := h.svc.PermResourceActionsU(ctx, actions)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResActions.Response](err), nil
	}

	return utils.SuccessResponse[pbResActions.Response]("Cập nhật thành công", data), nil
}

func (h *PermResourceActionHandler) PermResourceActionsD(ctx context.Context, req *pbResActions.PermResourceActionsDRequest) (*pbResActions.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbResActions.Response]("Dữ liệu xóa không được để trống"), nil
	}

	actions := make([]domainRoles.ERPPermResourceActions, len(req.Result))
	for i, item := range req.Result {
		actions[i] = domainRoles.ERPPermResourceActions{
			IdSeq:      item.IdSeq,
			RowVersion: item.RowVersion,
		}
	}

	data, err := h.svc.PermResourceActionsD(ctx, actions)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResActions.Response](err), nil
	}

	return utils.SuccessResponse[pbResActions.Response]("Xóa thành công", data), nil
}

func (h *PermResourceActionHandler) PermResourceActionsQ(ctx context.Context, req *pbResActions.PermResourceActionsQRequest) (*pbResActions.Response, error) {
	filters := make(map[string]string)

	if req.Result != nil {
		if req.Result.ResourceSeq != "" {
			filters["ResourceSeq"] = req.Result.ResourceSeq
		}
		if req.Result.ActionSeq != "" {
			filters["ActionSeq"] = req.Result.ActionSeq
		}
		if req.Result.ActionCode != "" {
			filters["ActionCode"] = req.Result.ActionCode
		} else if req.Result.KeyItem1 != "" {
			filters["ActionCode"] = req.Result.KeyItem1
		}
		if req.Result.ActionName != "" {
			filters["ActionName"] = req.Result.ActionName
		} else if req.Result.KeyItem2 != "" {
			filters["ActionName"] = req.Result.KeyItem2
		}
		if req.Result.LangKey != "" {
			filters["LangKey"] = req.Result.LangKey
		}
		if req.Result.IsDefaultAllow != "" {
			filters["IsDefaultAllow"] = req.Result.IsDefaultAllow
		}
	}

	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" {
				filters[k] = v
			}
		}
	}

	data, pageInfo, err := h.svc.PermResourceActionsQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResActions.Response](err), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pbResActions.Response]("Truy vấn thành công", data, pageStr), nil
}
