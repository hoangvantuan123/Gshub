package roles

import (
	"context"
	"encoding/json"

	domainRoles "server-core/internal/models/roles"
	"server-core/internal/service/roles/perm_resource_scope"
	"server-core/internal/utils"
	pbResScopes "server-core/proto/users/roles/perm_resource_scopes"
)

type PermResourceScopeHandler struct {
	pbResScopes.UnimplementedPermResourceScopesServiceServer
	svc *perm_resource_scope.PermResourceScopesService
}

func NewPermResourceScopeHandler(svc *perm_resource_scope.PermResourceScopesService) *PermResourceScopeHandler {
	return &PermResourceScopeHandler{
		svc: svc,
	}
}

func (h *PermResourceScopeHandler) PermResourceScopesA(ctx context.Context, req *pbResScopes.PermResourceScopesARequest) (*pbResScopes.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbResScopes.Response]("Dữ liệu thêm mới không được để trống"), nil
	}

	scopes := make([]domainRoles.ERPPermResourceScopes, len(req.Result))
	for i, item := range req.Result {
		var customScopeName *string
		if item.CustomScopeName != "" {
			cName := item.CustomScopeName
			customScopeName = &cName
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

		scopes[i] = domainRoles.ERPPermResourceScopes{
			ResourceSeq:     item.ResourceSeq,
			ScopeSeq:        item.ScopeSeq,
			CustomScopeName: customScopeName,
			OrderNo:         int(item.OrderNo),
			Comment:         comment,
			IdxNo:           idxNo,
			CreatedBy:       createdBy,
			UpdatedBy:       updatedBy,
		}
	}

	data, err := h.svc.PermResourceScopesA(ctx, scopes)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResScopes.Response](err), nil
	}

	return utils.SuccessResponse[pbResScopes.Response]("Thêm mới thành công", data), nil
}

func (h *PermResourceScopeHandler) PermResourceScopesU(ctx context.Context, req *pbResScopes.PermResourceScopesURequest) (*pbResScopes.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbResScopes.Response]("Dữ liệu cập nhật không được để trống"), nil
	}

	scopes := make([]domainRoles.ERPPermResourceScopes, len(req.Result))
	for i, item := range req.Result {
		var customScopeName *string
		if item.CustomScopeName != "" {
			cName := item.CustomScopeName
			customScopeName = &cName
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

		scopes[i] = domainRoles.ERPPermResourceScopes{
			IdSeq:           item.IdSeq,
			ResourceSeq:     item.ResourceSeq,
			ScopeSeq:        item.ScopeSeq,
			CustomScopeName: customScopeName,
			OrderNo:         int(item.OrderNo),
			Comment:         comment,
			RowVersion:      item.RowVersion,
			IdxNo:           idxNo,
			UpdatedBy:       updatedBy,
		}
	}

	data, err := h.svc.PermResourceScopesU(ctx, scopes)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResScopes.Response](err), nil
	}

	return utils.SuccessResponse[pbResScopes.Response]("Cập nhật thành công", data), nil
}

func (h *PermResourceScopeHandler) PermResourceScopesD(ctx context.Context, req *pbResScopes.PermResourceScopesDRequest) (*pbResScopes.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbResScopes.Response]("Dữ liệu xóa không được để trống"), nil
	}

	scopes := make([]domainRoles.ERPPermResourceScopes, len(req.Result))
	for i, item := range req.Result {
		scopes[i] = domainRoles.ERPPermResourceScopes{
			IdSeq:      item.IdSeq,
			RowVersion: item.RowVersion,
		}
	}

	data, err := h.svc.PermResourceScopesD(ctx, scopes)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResScopes.Response](err), nil
	}

	return utils.SuccessResponse[pbResScopes.Response]("Xóa thành công", data), nil
}

func (h *PermResourceScopeHandler) PermResourceScopesQ(ctx context.Context, req *pbResScopes.PermResourceScopesQRequest) (*pbResScopes.Response, error) {
	filters := make(map[string]string)

	if req.Result != nil {
		if req.Result.ResourceSeq != "" {
			filters["ResourceSeq"] = req.Result.ResourceSeq
		}
		if req.Result.ScopeSeq != "" {
			filters["ScopeSeq"] = req.Result.ScopeSeq
		}
		if req.Result.ScopeCode != "" {
			filters["ScopeCode"] = req.Result.ScopeCode
		} else if req.Result.KeyItem1 != "" {
			filters["ScopeCode"] = req.Result.KeyItem1
		}
		if req.Result.ScopeName != "" {
			filters["ScopeName"] = req.Result.ScopeName
		} else if req.Result.KeyItem2 != "" {
			filters["ScopeName"] = req.Result.KeyItem2
		}
		if req.Result.LangKey != "" {
			filters["LangKey"] = req.Result.LangKey
		}
	}

	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" {
				filters[k] = v
			}
		}
	}

	data, pageInfo, err := h.svc.PermResourceScopesQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResScopes.Response](err), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pbResScopes.Response]("Truy vấn thành công", data, pageStr), nil
}
