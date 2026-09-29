package roles

import (
	"context"
	"encoding/json"

	domainRoles "server-core/internal/models/roles"
	"server-core/internal/service/roles/perm_action"
	"server-core/internal/utils"
	pbActions "server-core/proto/users/roles/perm_actions"

	"go.uber.org/zap"
)

type PermActionHandler struct {
	pbActions.UnimplementedPermActionsServiceServer
	permActionsSvc *perm_action.PermActionsService
	log            *zap.Logger
}

func NewPermActionHandler(
	permActions *perm_action.PermActionsService,
	log *zap.Logger,
) *PermActionHandler {
	return &PermActionHandler{
		permActionsSvc: permActions,
		log:            log,
	}
}

func (h *PermActionHandler) PermActionsA(ctx context.Context, req *pbActions.PermActionsARequest) (*pbActions.Response, error) {
	var actions []domainRoles.ERPPermActions
	for _, item := range req.Result {
		idxNo := int(item.IdxNo)
		langKey := item.LangKey
		comment := item.Comment
		createdBy := item.CreatedBy
		updatedBy := item.UpdatedBy

		actions = append(actions, domainRoles.ERPPermActions{
			ActionCode:     item.ActionCode,
			ActionName:     item.ActionName,
			LangKey:        &langKey,
			IsDefaultAllow: item.IsDefaultAllow,
			Comment:        &comment,
			IdxNo:          &idxNo,
			CreatedBy:      &createdBy,
			UpdatedBy:      &updatedBy,
		})
	}

	data, err := h.permActionsSvc.PermActionsA(ctx, actions)
	if err != nil {
		return utils.ErrorResponseFromErr[pbActions.Response](err), nil
	}

	return utils.SuccessResponse[pbActions.Response]("Thêm mới thành công", data), nil
}

func (h *PermActionHandler) PermActionsU(ctx context.Context, req *pbActions.PermActionsURequest) (*pbActions.Response, error) {
	var actions []domainRoles.ERPPermActions
	for _, item := range req.Result {
		idxNo := int(item.IdxNo)
		langKey := item.LangKey
		comment := item.Comment
		updatedBy := item.UpdatedBy

		actions = append(actions, domainRoles.ERPPermActions{
			IdSeq:          item.IdSeq,
			ActionCode:     item.ActionCode,
			ActionName:     item.ActionName,
			LangKey:        &langKey,
			IsDefaultAllow: item.IsDefaultAllow,
			Comment:        &comment,
			RowVersion:     item.RowVersion,
			IdxNo:          &idxNo,
			UpdatedBy:      &updatedBy,
		})
	}

	data, err := h.permActionsSvc.PermActionsU(ctx, actions)
	if err != nil {
		return utils.ErrorResponseFromErr[pbActions.Response](err), nil
	}

	return utils.SuccessResponse[pbActions.Response]("Cập nhật thành công", data), nil
}

func (h *PermActionHandler) PermActionsD(ctx context.Context, req *pbActions.PermActionsDRequest) (*pbActions.Response, error) {
	var actions []domainRoles.ERPPermActions
	for _, item := range req.Result {
		if item.IdSeq != "" {
			actions = append(actions, domainRoles.ERPPermActions{
				IdSeq:      item.IdSeq,
				RowVersion: item.RowVersion,
			})
		}
	}

	data, err := h.permActionsSvc.PermActionsD(ctx, actions)
	if err != nil {
		return utils.ErrorResponseFromErr[pbActions.Response](err), nil
	}

	return utils.SuccessResponse[pbActions.Response]("Xóa thành công", data), nil
}

func (h *PermActionHandler) PermActionsQ(ctx context.Context, req *pbActions.PermActionsQRequest) (*pbActions.Response, error) {
	filters := make(map[string]string)

	if req.Result != nil {
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
		if req.Result.KeyItem3 != "" {
			filters["Comment"] = req.Result.KeyItem3
		}
	}

	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" {
				filters[k] = v
			}
		}
	}

	data, pageInfo, err := h.permActionsSvc.PermActionsQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponseFromErr[pbActions.Response](err), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pbActions.Response]("Truy vấn thành công", data, pageStr), nil
}
