package roles

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	domain "server-core/internal/models/roles"
	rootMenuSvc "server-core/internal/service/roles/root_menu"
	"server-core/internal/utils"
	pb_root_menu "server-core/proto/users/roles/root_menu"

	"go.uber.org/zap"
)

type RootMenuHandler struct {
	pb_root_menu.UnimplementedRootMenuServiceServer
	rootMenusSvc *rootMenuSvc.RootMenusService
	log          *zap.Logger
}

func NewRootMenuHandler(rootMenus *rootMenuSvc.RootMenusService, log *zap.Logger) *RootMenuHandler {
	return &RootMenuHandler{
		rootMenusSvc: rootMenus,
		log:          log,
	}
}

func (h *RootMenuHandler) RootMenuA(ctx context.Context, req *pb_root_menu.RootMenuARequest) (*pb_root_menu.Response, error) {
	userSeq, _ := ctx.Value("user_seq").(string)
	var rootMenus []domain.ERPRootMenus
	for _, item := range req.Result {
		rm := domain.ERPRootMenus{}
		if userSeq != "" {
			rm.CreatedBy = userSeq
			rm.UpdatedBy = userSeq
		} else {
			if item.CreatedBy != "" {
				rm.CreatedBy = item.CreatedBy
			}
			if item.UpdatedBy != "" {
				rm.UpdatedBy = item.UpdatedBy
			}
		}
		if item.Label != "" {
			val := item.Label
			rm.Label = &val
		}
		if item.Key != "" {
			val := item.Key
			rm.Key = &val
		}
		if item.Link != "" {
			val := item.Link
			rm.Link = &val
		}
		if item.Icon != "" {
			val := item.Icon
			rm.Icon = &val
		}
		if item.IdxNo != 0 {
			val := int(item.IdxNo)
			rm.IdxNo = &val
		}
		rm.Utilities = item.Utilities
		rootMenus = append(rootMenus, rm)
	}

	data, err := h.rootMenusSvc.RootMenuA(ctx, rootMenus)
	if err != nil {
		h.log.Error("RootMenuA failed", zap.Error(err))
		if batchErr, ok := err.(*domain.BatchSaveError); ok {
			return utils.ErrorWithDataResponse[pb_root_menu.Response](batchErr.Message, batchErr.Details), nil
		}
		return utils.ErrorResponse[pb_root_menu.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_root_menu.Response]("Thành công", data), nil
}

func (h *RootMenuHandler) RootMenuU(ctx context.Context, req *pb_root_menu.RootMenuURequest) (*pb_root_menu.Response, error) {
	userSeq, _ := ctx.Value("user_seq").(string)
	if h.log != nil && req != nil {
		for i, item := range req.Result {
			h.log.Info("[RootMenuHandler.RootMenuU Item Received]",
				zap.Int("index", i),
				zap.Int32("id", item.Id),
				zap.Any("row_version", item.RowVersion),
				zap.String("key", item.Key),
				zap.String("label", item.Label),
				zap.String("updated_at", item.UpdatedAt),
				zap.String("updated_by", item.UpdatedBy),
			)
		}
	}
	var rootMenus []domain.ERPRootMenus
	for _, item := range req.Result {
		rm := domain.ERPRootMenus{
			Id: fmt.Sprintf("%v", item.Id),
		}
		if userSeq != "" {
			rm.UpdatedBy = userSeq
		} else if item.UpdatedBy != "" {
			rm.UpdatedBy = item.UpdatedBy
		}
		if item.UpdatedAt != "" {
			val := item.UpdatedAt
			rm.UpdatedAt = &val
		}
		if item.Label != "" {
			val := item.Label
			rm.Label = &val
		}
		if item.Key != "" {
			val := item.Key
			rm.Key = &val
		}
		if item.Link != "" {
			val := item.Link
			rm.Link = &val
		}
		if item.Icon != "" {
			val := item.Icon
			rm.Icon = &val
		}
		if item.IdxNo != 0 {
			val := int(item.IdxNo)
			rm.IdxNo = &val
		}
		rm.Utilities = item.Utilities
		rm.RowVersion = item.RowVersion
		rootMenus = append(rootMenus, rm)
	}

	data, err := h.rootMenusSvc.RootMenuU(ctx, rootMenus)
	if err != nil {
		h.log.Error("RootMenuU failed", zap.Error(err))
		if batchErr, ok := err.(*domain.BatchSaveError); ok {
			return utils.ErrorWithDataResponse[pb_root_menu.Response](batchErr.Message, batchErr.Details), nil
		}
		return utils.ErrorResponse[pb_root_menu.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_root_menu.Response]("Thành công", data), nil
}

func (h *RootMenuHandler) RootMenuD(ctx context.Context, req *pb_root_menu.RootMenuDRequest) (*pb_root_menu.Response, error) {
	var rootMenus []domain.ERPRootMenus
	for _, item := range req.Result {
		rootMenus = append(rootMenus, domain.ERPRootMenus{
			Id:         fmt.Sprintf("%v", item.Id),
			RowVersion: item.RowVersion,
		})
	}

	data, err := h.rootMenusSvc.RootMenuD(ctx, rootMenus)
	if err != nil {
		h.log.Error("RootMenuD failed", zap.Error(err))
		if batchErr, ok := err.(*domain.BatchSaveError); ok {
			return utils.ErrorWithDataResponse[pb_root_menu.Response](batchErr.Message, batchErr.Details), nil
		}
		return utils.ErrorResponse[pb_root_menu.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb_root_menu.Response]("Thành công", data), nil
}

func (h *RootMenuHandler) RootMenuQ(ctx context.Context, req *pb_root_menu.RootMenuQRequest) (*pb_root_menu.Response, error) {
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

	data, pageInfo, err := h.rootMenusSvc.RootMenuQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponse[pb_root_menu.Response](err.Error()), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pb_root_menu.Response]("Truy vấn thành công", data, pageStr), nil
}
