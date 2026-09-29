package system

import (
	"context"
	"encoding/json"

	domain "server-core/internal/models/system"
	"server-core/internal/service/system/sys_attr_group"
	"server-core/internal/utils"
	pbGroups "server-core/proto/users/system/sys_attr_groups"

	"go.uber.org/zap"
)

type SysAttrGroupHandler struct {
	pbGroups.UnimplementedSysAttrGroupsServiceServer
	sysAttrGroupsSvc *sys_attr_group.SysAttrGroupsService
	log              *zap.Logger
}

func NewSysAttrGroupHandler(
	sysAttrGroups *sys_attr_group.SysAttrGroupsService,
	log *zap.Logger,
) *SysAttrGroupHandler {
	return &SysAttrGroupHandler{
		sysAttrGroupsSvc: sysAttrGroups,
		log:              log,
	}
}

func (h *SysAttrGroupHandler) SysAttrGroupsA(ctx context.Context, req *pbGroups.SysAttrGroupsARequest) (*pbGroups.Response, error) {
	var groups []domain.ERPSysAttrGroups
	for _, item := range req.Result {
		idxNo := int(item.IdxNo)
		gName := item.GroupName
		langKey := item.LangKey
		comment := item.Comment
		createdBy := item.CreatedBy

		groups = append(groups, domain.ERPSysAttrGroups{
			GroupCode: item.GroupCode,
			GroupName: &gName,
			CodeHelp:  item.CodeHelp,
			LangKey:   &langKey,
			Comment:   &comment,
			IdxNo:     &idxNo,
			CreatedBy: &createdBy,
		})
	}

	data, err := h.sysAttrGroupsSvc.SysAttrGroupsA(ctx, groups)
	if err != nil {
		return utils.ErrorResponseFromErr[pbGroups.Response](err), nil
	}

	return utils.SuccessResponse[pbGroups.Response]("Thêm mới thành công", data), nil
}

func (h *SysAttrGroupHandler) SysAttrGroupsU(ctx context.Context, req *pbGroups.SysAttrGroupsURequest) (*pbGroups.Response, error) {
	var groups []domain.ERPSysAttrGroups
	for _, item := range req.Result {
		idxNo := int(item.IdxNo)
		gName := item.GroupName
		langKey := item.LangKey
		comment := item.Comment
		updatedBy := item.UpdatedBy

		groups = append(groups, domain.ERPSysAttrGroups{
			IdSeq:      item.IdSeq,
			GroupCode:  item.GroupCode,
			GroupName:  &gName,
			CodeHelp:   item.CodeHelp,
			LangKey:    &langKey,
			Comment:    &comment,
			RowVersion: item.RowVersion,
			IdxNo:      &idxNo,
			UpdatedBy:  &updatedBy,
		})
	}

	data, err := h.sysAttrGroupsSvc.SysAttrGroupsU(ctx, groups)
	if err != nil {
		return utils.ErrorResponseFromErr[pbGroups.Response](err), nil
	}

	return utils.SuccessResponse[pbGroups.Response]("Cập nhật thành công", data), nil
}

func (h *SysAttrGroupHandler) SysAttrGroupsD(ctx context.Context, req *pbGroups.SysAttrGroupsDRequest) (*pbGroups.Response, error) {
	var groups []domain.ERPSysAttrGroups
	for _, item := range req.Result {
		if item.IdSeq != "" {
			groups = append(groups, domain.ERPSysAttrGroups{
				IdSeq:      item.IdSeq,
				RowVersion: item.RowVersion,
			})
		}
	}

	data, err := h.sysAttrGroupsSvc.SysAttrGroupsD(ctx, groups)
	if err != nil {
		return utils.ErrorResponseFromErr[pbGroups.Response](err), nil
	}

	return utils.SuccessResponse[pbGroups.Response]("Xóa thành công", data), nil
}

func (h *SysAttrGroupHandler) SysAttrGroupsQ(ctx context.Context, req *pbGroups.SysAttrGroupsQRequest) (*pbGroups.Response, error) {
	filters := make(map[string]string)

	if req.Result != nil {
		if req.Result.GroupCode != "" {
			filters["GroupCode"] = req.Result.GroupCode
		} else if req.Result.KeyItem1 != "" {
			filters["GroupCode"] = req.Result.KeyItem1
		}
		if req.Result.GroupName != "" {
			filters["GroupName"] = req.Result.GroupName
		} else if req.Result.KeyItem2 != "" {
			filters["GroupName"] = req.Result.KeyItem2
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

	data, pageInfo, err := h.sysAttrGroupsSvc.SysAttrGroupsQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponseFromErr[pbGroups.Response](err), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pbGroups.Response]("Truy vấn thành công", data, pageStr), nil
}
