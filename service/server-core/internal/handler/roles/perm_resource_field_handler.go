package roles

import (
	"context"
	"encoding/json"

	domainRoles "server-core/internal/models/roles"
	"server-core/internal/service/roles/perm_resource_field"
	"server-core/internal/utils"
	pbResFields "server-core/proto/users/roles/perm_resource_fields"
)

type PermResourceFieldHandler struct {
	pbResFields.UnimplementedPermResourceFieldsServiceServer
	svc *perm_resource_field.PermResourceFieldsService
}

func NewPermResourceFieldHandler(svc *perm_resource_field.PermResourceFieldsService) *PermResourceFieldHandler {
	return &PermResourceFieldHandler{
		svc: svc,
	}
}

func (h *PermResourceFieldHandler) PermResourceFieldsA(ctx context.Context, req *pbResFields.PermResourceFieldsARequest) (*pbResFields.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbResFields.Response]("Dữ liệu thêm mới không được để trống"), nil
	}

	fields := make([]domainRoles.ERPPermResourceFields, len(req.Result))
	for i, item := range req.Result {
		var customFieldName *string
		if item.CustomFieldName != "" {
			cName := item.CustomFieldName
			customFieldName = &cName
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

		fields[i] = domainRoles.ERPPermResourceFields{
			ResourceSeq:     item.ResourceSeq,
			FieldSeq:        item.FieldSeq,
			CustomFieldName: customFieldName,
			IsMaskable:      item.IsMaskable,
			IsSensitive:     item.IsSensitive,
			OrderNo:         int(item.OrderNo),
			Comment:         comment,
			IdxNo:           idxNo,
			CreatedBy:       createdBy,
			UpdatedBy:       updatedBy,
		}
	}

	data, err := h.svc.PermResourceFieldsA(ctx, fields)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResFields.Response](err), nil
	}

	return utils.SuccessResponse[pbResFields.Response]("Thêm mới thành công", data), nil
}

func (h *PermResourceFieldHandler) PermResourceFieldsU(ctx context.Context, req *pbResFields.PermResourceFieldsURequest) (*pbResFields.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbResFields.Response]("Dữ liệu cập nhật không được để trống"), nil
	}

	fields := make([]domainRoles.ERPPermResourceFields, len(req.Result))
	for i, item := range req.Result {
		var customFieldName *string
		if item.CustomFieldName != "" {
			cName := item.CustomFieldName
			customFieldName = &cName
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

		fields[i] = domainRoles.ERPPermResourceFields{
			IdSeq:           item.IdSeq,
			ResourceSeq:     item.ResourceSeq,
			FieldSeq:        item.FieldSeq,
			CustomFieldName: customFieldName,
			IsMaskable:      item.IsMaskable,
			IsSensitive:     item.IsSensitive,
			OrderNo:         int(item.OrderNo),
			Comment:         comment,
			RowVersion:      item.RowVersion,
			IdxNo:           idxNo,
			UpdatedBy:       updatedBy,
		}
	}

	data, err := h.svc.PermResourceFieldsU(ctx, fields)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResFields.Response](err), nil
	}

	return utils.SuccessResponse[pbResFields.Response]("Cập nhật thành công", data), nil
}

func (h *PermResourceFieldHandler) PermResourceFieldsD(ctx context.Context, req *pbResFields.PermResourceFieldsDRequest) (*pbResFields.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbResFields.Response]("Dữ liệu xóa không được để trống"), nil
	}

	fields := make([]domainRoles.ERPPermResourceFields, len(req.Result))
	for i, item := range req.Result {
		fields[i] = domainRoles.ERPPermResourceFields{
			IdSeq:      item.IdSeq,
			RowVersion: item.RowVersion,
		}
	}

	data, err := h.svc.PermResourceFieldsD(ctx, fields)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResFields.Response](err), nil
	}

	return utils.SuccessResponse[pbResFields.Response]("Xóa thành công", data), nil
}

func (h *PermResourceFieldHandler) PermResourceFieldsQ(ctx context.Context, req *pbResFields.PermResourceFieldsQRequest) (*pbResFields.Response, error) {
	filters := make(map[string]string)

	if req.Result != nil {
		if req.Result.ResourceSeq != "" {
			filters["ResourceSeq"] = req.Result.ResourceSeq
		}
		if req.Result.FieldSeq != "" {
			filters["FieldSeq"] = req.Result.FieldSeq
		}
		if req.Result.FieldCode != "" {
			filters["FieldCode"] = req.Result.FieldCode
		} else if req.Result.KeyItem1 != "" {
			filters["FieldCode"] = req.Result.KeyItem1
		}
		if req.Result.FieldName != "" {
			filters["FieldName"] = req.Result.FieldName
		} else if req.Result.KeyItem2 != "" {
			filters["FieldName"] = req.Result.KeyItem2
		}
		if req.Result.LangKey != "" {
			filters["LangKey"] = req.Result.LangKey
		}
		if req.Result.IsMaskable != "" {
			filters["IsMaskable"] = req.Result.IsMaskable
		}
		if req.Result.IsSensitive != "" {
			filters["IsSensitive"] = req.Result.IsSensitive
		}
	}

	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" {
				filters[k] = v
			}
		}
	}

	data, pageInfo, err := h.svc.PermResourceFieldsQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponseFromErr[pbResFields.Response](err), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pbResFields.Response]("Truy vấn thành công", data, pageStr), nil
}
