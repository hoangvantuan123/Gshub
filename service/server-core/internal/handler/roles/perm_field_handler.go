package roles

import (
	"context"
	"encoding/json"

	domainRoles "server-core/internal/models/roles"
	"server-core/internal/service/roles/perm_field"
	"server-core/internal/utils"
	pbFields "server-core/proto/users/roles/perm_fields"
)

type PermFieldHandler struct {
	pbFields.UnimplementedPermFieldsServiceServer
	permFieldsSvc *perm_field.PermFieldsService
}

func NewPermFieldHandler(permFieldsSvc *perm_field.PermFieldsService) *PermFieldHandler {
	return &PermFieldHandler{
		permFieldsSvc: permFieldsSvc,
	}
}

func (h *PermFieldHandler) PermFieldsA(ctx context.Context, req *pbFields.PermFieldsARequest) (*pbFields.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbFields.Response]("Dữ liệu thêm mới không được để trống"), nil
	}

	fields := make([]domainRoles.ERPPermFields, len(req.Result))
	for i, item := range req.Result {
		resourceSeq := item.ResourceSeq
		resourceCode := item.ResourceCode
		fieldCode := item.FieldCode
		fieldName := item.FieldName
		langKey := item.LangKey
		comment := item.Comment
		createdBy := item.CreatedBy
		updatedBy := item.UpdatedBy
		idxNo := int(item.IdxNo)

		var dictSeq *int64
		if item.DictSeq > 0 {
			dSeq := item.DictSeq
			dictSeq = &dSeq
		}

		fields[i] = domainRoles.ERPPermFields{
			ResourceSeq:  &resourceSeq,
			ResourceCode: &resourceCode,
			FieldCode:    &fieldCode,
			FieldName:    &fieldName,
			DictSeq:      dictSeq,
			LangKey:      &langKey,
			IsMaskable:   item.IsMaskable,
			IsSensitive:  item.IsSensitive,
			OrderNo:      int(item.OrderNo),
			Comment:      &comment,
			IdxNo:        &idxNo,
			CreatedBy:    &createdBy,
			UpdatedBy:    &updatedBy,
		}
	}

	data, err := h.permFieldsSvc.PermFieldsA(ctx, fields)
	if err != nil {
		return utils.ErrorResponseFromErr[pbFields.Response](err), nil
	}

	return utils.SuccessResponse[pbFields.Response]("Thêm mới thành công", data), nil
}

func (h *PermFieldHandler) PermFieldsU(ctx context.Context, req *pbFields.PermFieldsURequest) (*pbFields.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbFields.Response]("Dữ liệu cập nhật không được để trống"), nil
	}

	fields := make([]domainRoles.ERPPermFields, len(req.Result))
	for i, item := range req.Result {
		idSeq := item.IdSeq
		resourceSeq := item.ResourceSeq
		resourceCode := item.ResourceCode
		fieldCode := item.FieldCode
		fieldName := item.FieldName
		langKey := item.LangKey
		comment := item.Comment
		updatedBy := item.UpdatedBy
		idxNo := int(item.IdxNo)

		var dictSeq *int64
		if item.DictSeq > 0 {
			dSeq := item.DictSeq
			dictSeq = &dSeq
		}

		fields[i] = domainRoles.ERPPermFields{
			IdSeq:        idSeq,
			ResourceSeq:  &resourceSeq,
			ResourceCode: &resourceCode,
			FieldCode:    &fieldCode,
			FieldName:    &fieldName,
			DictSeq:      dictSeq,
			LangKey:      &langKey,
			IsMaskable:   item.IsMaskable,
			IsSensitive:  item.IsSensitive,
			OrderNo:      int(item.OrderNo),
			Comment:      &comment,
			RowVersion:   item.RowVersion,
			IdxNo:        &idxNo,
			UpdatedBy:    &updatedBy,
		}
	}

	data, err := h.permFieldsSvc.PermFieldsU(ctx, fields)
	if err != nil {
		return utils.ErrorResponseFromErr[pbFields.Response](err), nil
	}

	return utils.SuccessResponse[pbFields.Response]("Cập nhật thành công", data), nil
}

func (h *PermFieldHandler) PermFieldsD(ctx context.Context, req *pbFields.PermFieldsDRequest) (*pbFields.Response, error) {
	if req == nil || len(req.Result) == 0 {
		return utils.ErrorResponse[pbFields.Response]("Dữ liệu xóa không được để trống"), nil
	}

	fields := make([]domainRoles.ERPPermFields, len(req.Result))
	for i, item := range req.Result {
		fields[i] = domainRoles.ERPPermFields{
			IdSeq:      item.IdSeq,
			RowVersion: item.RowVersion,
		}
	}

	data, err := h.permFieldsSvc.PermFieldsD(ctx, fields)
	if err != nil {
		return utils.ErrorResponseFromErr[pbFields.Response](err), nil
	}

	return utils.SuccessResponse[pbFields.Response]("Xóa thành công", data), nil
}

func (h *PermFieldHandler) PermFieldsQ(ctx context.Context, req *pbFields.PermFieldsQRequest) (*pbFields.Response, error) {
	filters := make(map[string]string)

	if req.Result != nil {
		if req.Result.ResourceSeq != "" {
			filters["ResourceSeq"] = req.Result.ResourceSeq
		}
		if req.Result.ResourceCode != "" {
			filters["ResourceCode"] = req.Result.ResourceCode
		} else if req.Result.KeyItem1 != "" {
			filters["ResourceCode"] = req.Result.KeyItem1
		}
		if req.Result.FieldCode != "" {
			filters["FieldCode"] = req.Result.FieldCode
		} else if req.Result.KeyItem2 != "" {
			filters["FieldCode"] = req.Result.KeyItem2
		}
		if req.Result.FieldName != "" {
			filters["FieldName"] = req.Result.FieldName
		} else if req.Result.KeyItem3 != "" {
			filters["FieldName"] = req.Result.KeyItem3
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

	data, pageInfo, err := h.permFieldsSvc.PermFieldsQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponseFromErr[pbFields.Response](err), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pbFields.Response]("Truy vấn thành công", data, pageStr), nil
}
