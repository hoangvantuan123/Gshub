package roles

import (
	"context"
	"encoding/json"

	domainRoles "server-core/internal/models/roles"
	"server-core/internal/service/roles/perm_scope"
	"server-core/internal/utils"
	pbScopes "server-core/proto/users/roles/perm_scopes"
)

type PermScopeHandler struct {
	pbScopes.UnimplementedPermScopesServiceServer
	permScopesSvc *perm_scope.PermScopesService
}

func NewPermScopeHandler(permScopesSvc *perm_scope.PermScopesService) *PermScopeHandler {
	return &PermScopeHandler{
		permScopesSvc: permScopesSvc,
	}
}

func (h *PermScopeHandler) PermScopesA(ctx context.Context, req *pbScopes.PermScopesARequest) (*pbScopes.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbScopes.Response]("Dữ liệu thêm mới không được để trống"), nil
	}

	scopes := make([]domainRoles.ERPPermScopes, len(req.Result))
	for i, item := range req.Result {
		scopeCode := item.ScopeCode
		scopeName := item.ScopeName
		langKey := item.LangKey
		permActionSeq := item.PermActionSeq
		scopeLevelSeq := item.ScopeLevelSeq
		ruleConditionSeq := item.RuleConditionSeq
		conditionSql := item.ConditionSql
		comment := item.Comment
		createdBy := item.CreatedBy
		updatedBy := item.UpdatedBy
		idxNo := int(item.IdxNo)

		scopes[i] = domainRoles.ERPPermScopes{
			ScopeCode:        &scopeCode,
			ScopeName:        &scopeName,
			LangKey:          &langKey,
			PermActionSeq:    &permActionSeq,
			ScopeLevelSeq:    &scopeLevelSeq,
			RuleConditionSeq: &ruleConditionSeq,
			ConditionSql:     &conditionSql,
			Comment:          &comment,
			IdxNo:            &idxNo,
			CreatedBy:        &createdBy,
			UpdatedBy:        &updatedBy,
		}
	}

	data, err := h.permScopesSvc.PermScopesA(ctx, scopes)
	if err != nil {
		return utils.ErrorResponseFromErr[pbScopes.Response](err), nil
	}

	return utils.SuccessResponse[pbScopes.Response]("Thêm mới thành công", data), nil
}

func (h *PermScopeHandler) PermScopesU(ctx context.Context, req *pbScopes.PermScopesURequest) (*pbScopes.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbScopes.Response]("Dữ liệu cập nhật không được để trống"), nil
	}

	scopes := make([]domainRoles.ERPPermScopes, len(req.Result))
	for i, item := range req.Result {
		idSeq := item.IdSeq
		scopeCode := item.ScopeCode
		scopeName := item.ScopeName
		langKey := item.LangKey
		permActionSeq := item.PermActionSeq
		scopeLevelSeq := item.ScopeLevelSeq
		ruleConditionSeq := item.RuleConditionSeq
		conditionSql := item.ConditionSql
		comment := item.Comment
		updatedBy := item.UpdatedBy
		idxNo := int(item.IdxNo)

		scopes[i] = domainRoles.ERPPermScopes{
			IdSeq:            idSeq,
			ScopeCode:        &scopeCode,
			ScopeName:        &scopeName,
			LangKey:          &langKey,
			PermActionSeq:    &permActionSeq,
			ScopeLevelSeq:    &scopeLevelSeq,
			RuleConditionSeq: &ruleConditionSeq,
			ConditionSql:     &conditionSql,
			Comment:          &comment,
			RowVersion:       item.RowVersion,
			IdxNo:            &idxNo,
			UpdatedBy:        &updatedBy,
		}
	}

	data, err := h.permScopesSvc.PermScopesU(ctx, scopes)
	if err != nil {
		return utils.ErrorResponseFromErr[pbScopes.Response](err), nil
	}

	return utils.SuccessResponse[pbScopes.Response]("Cập nhật thành công", data), nil
}

func (h *PermScopeHandler) PermScopesD(ctx context.Context, req *pbScopes.PermScopesDRequest) (*pbScopes.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbScopes.Response]("Dữ liệu xóa không được để trống"), nil
	}

	scopes := make([]domainRoles.ERPPermScopes, len(req.Result))
	for i, item := range req.Result {
		scopes[i] = domainRoles.ERPPermScopes{
			IdSeq:      item.IdSeq,
			RowVersion: item.RowVersion,
		}
	}

	data, err := h.permScopesSvc.PermScopesD(ctx, scopes)
	if err != nil {
		return utils.ErrorResponseFromErr[pbScopes.Response](err), nil
	}

	return utils.SuccessResponse[pbScopes.Response]("Xóa thành công", data), nil
}

func (h *PermScopeHandler) PermScopesQ(ctx context.Context, req *pbScopes.PermScopesQRequest) (*pbScopes.Response, error) {
	filters := make(map[string]string)

	if req.Result != nil {
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
		if req.Result.PermActionSeq != "" {
			filters["PermActionSeq"] = req.Result.PermActionSeq
		}
		if req.Result.ScopeLevelSeq != "" {
			filters["ScopeLevelSeq"] = req.Result.ScopeLevelSeq
		}
		if req.Result.RuleConditionSeq != "" {
			filters["RuleConditionSeq"] = req.Result.RuleConditionSeq
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

	data, pageInfo, err := h.permScopesSvc.PermScopesQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponseFromErr[pbScopes.Response](err), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pbScopes.Response]("Truy vấn thành công", data, pageStr), nil
}
