package system

import (
	"context"
	"encoding/json"

	domain "server-core/internal/models/system"
	"server-core/internal/service/system/sys_attr_item"
	"server-core/internal/utils"
	pbItems "server-core/proto/users/system/sys_attr_items"

	"go.uber.org/zap"
)

type SysAttrItemHandler struct {
	pbItems.UnimplementedSysAttrItemsServiceServer
	sysAttrItemsSvc *sys_attr_item.SysAttrItemsService
	log             *zap.Logger
}

func NewSysAttrItemHandler(
	sysAttrItems *sys_attr_item.SysAttrItemsService,
	log *zap.Logger,
) *SysAttrItemHandler {
	return &SysAttrItemHandler{
		sysAttrItemsSvc: sysAttrItems,
		log:             log,
	}
}

func (h *SysAttrItemHandler) SysAttrItemsA(ctx context.Context, req *pbItems.SysAttrItemsARequest) (*pbItems.Response, error) {
	var items []domain.ERPSysAttrItems
	for _, item := range req.Result {
		idxNo := int(item.IdxNo)
		attrGroupSeq := item.AttrGroupSeq
		vName := item.AttrValueName
		langKey := item.LangKey
		extraVal := item.ExtraValue
		comment := item.Comment
		createdBy := item.CreatedBy

		items = append(items, domain.ERPSysAttrItems{
			AttrGroupSeq:  &attrGroupSeq,
			AttrValueCode: item.AttrValueCode,
			AttrValueName: &vName,
			LangKey:       &langKey,
			ExtraValue:    &extraVal,
			Comment:       &comment,
			IsActive:      item.IsActive,
			IdxNo:         &idxNo,
			CreatedBy:     &createdBy,
		})
	}

	data, err := h.sysAttrItemsSvc.SysAttrItemsA(ctx, items)
	if err != nil {
		return utils.ErrorResponseFromErr[pbItems.Response](err), nil
	}

	return utils.SuccessResponse[pbItems.Response]("Thêm mới thành công", data), nil
}

func (h *SysAttrItemHandler) SysAttrItemsU(ctx context.Context, req *pbItems.SysAttrItemsURequest) (*pbItems.Response, error) {
	var items []domain.ERPSysAttrItems
	for _, item := range req.Result {
		idxNo := int(item.IdxNo)
		attrGroupSeq := item.AttrGroupSeq
		vName := item.AttrValueName
		langKey := item.LangKey
		extraVal := item.ExtraValue
		comment := item.Comment
		updatedBy := item.UpdatedBy

		items = append(items, domain.ERPSysAttrItems{
			IdSeq:         item.IdSeq,
			AttrGroupSeq:  &attrGroupSeq,
			AttrValueCode: item.AttrValueCode,
			AttrValueName: &vName,
			LangKey:       &langKey,
			ExtraValue:    &extraVal,
			Comment:       &comment,
			IsActive:      item.IsActive,
			RowVersion:    item.RowVersion,
			IdxNo:         &idxNo,
			UpdatedBy:     &updatedBy,
		})
	}

	data, err := h.sysAttrItemsSvc.SysAttrItemsU(ctx, items)
	if err != nil {
		return utils.ErrorResponseFromErr[pbItems.Response](err), nil
	}

	return utils.SuccessResponse[pbItems.Response]("Cập nhật thành công", data), nil
}

func (h *SysAttrItemHandler) SysAttrItemsD(ctx context.Context, req *pbItems.SysAttrItemsDRequest) (*pbItems.Response, error) {
	var items []domain.ERPSysAttrItems
	for _, item := range req.Result {
		if item.IdSeq != "" {
			items = append(items, domain.ERPSysAttrItems{
				IdSeq:      item.IdSeq,
				RowVersion: item.RowVersion,
			})
		}
	}

	data, err := h.sysAttrItemsSvc.SysAttrItemsD(ctx, items)
	if err != nil {
		return utils.ErrorResponseFromErr[pbItems.Response](err), nil
	}

	return utils.SuccessResponse[pbItems.Response]("Xóa thành công", data), nil
}

func (h *SysAttrItemHandler) SysAttrItemsQ(ctx context.Context, req *pbItems.SysAttrItemsQRequest) (*pbItems.Response, error) {
	filters := make(map[string]string)

	if req.Result != nil {
		if req.Result.AttrGroupSeq != "" {
			filters["AttrGroupSeq"] = req.Result.AttrGroupSeq
		} else if req.Result.KeyItem1 != "" {
			filters["AttrGroupSeq"] = req.Result.KeyItem1
		}
		if req.Result.AttrValueCode != "" {
			filters["AttrValueCode"] = req.Result.AttrValueCode
		} else if req.Result.KeyItem2 != "" {
			filters["AttrValueCode"] = req.Result.KeyItem2
		}
		if req.Result.AttrValueName != "" {
			filters["AttrValueName"] = req.Result.AttrValueName
		} else if req.Result.KeyItem3 != "" {
			filters["AttrValueName"] = req.Result.KeyItem3
		}
	}

	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" {
				filters[k] = v
			}
		}
	}

	data, pageInfo, err := h.sysAttrItemsSvc.SysAttrItemsQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponseFromErr[pbItems.Response](err), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pbItems.Response]("Truy vấn thành công", data, pageStr), nil
}
