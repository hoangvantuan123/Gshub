package roles

import (
	"context"
	"encoding/json"
	"strings"

	domain "server-core/internal/models/roles"
	menuSvc "server-core/internal/service/roles/menu"
	"server-core/internal/utils"
	pb "server-core/proto/users/roles/menu"

	"go.uber.org/zap"
)

type MenuHandler struct {
	pb.UnimplementedMenuServiceServer
	menusSvc *menuSvc.MenusService
	log      *zap.Logger
}

func NewMenuHandler(menus *menuSvc.MenusService, log *zap.Logger) *MenuHandler {
	return &MenuHandler{
		menusSvc: menus,
		log:      log,
	}
}

func (h *MenuHandler) MenuA(ctx context.Context, req *pb.MenuARequest) (*pb.Response, error) {
	userSeq, _ := ctx.Value("user_seq").(string)
	var menus []domain.ERPMenus
	for _, item := range req.Result {
		menu := domain.ERPMenus{
			MenuRootId:    int(item.MenuRootId),
			MenuSubRootId: int(item.MenuSubRootId),
		}

		if userSeq != "" {
			menu.CreatedBy = userSeq
			menu.UpdatedBy = userSeq
		} else {
			if item.CreatedBy != "" {
				menu.CreatedBy = item.CreatedBy
			}
			if item.UpdatedBy != "" {
				menu.UpdatedBy = item.UpdatedBy
			}
		}

		if item.Key != "" {
			val := item.Key
			menu.Key = &val
		}
		if item.Label != "" {
			val := item.Label
			menu.Label = &val
		}
		if item.Link != "" {
			val := item.Link
			menu.Link = &val
		}
		if item.Type != "" {
			val := item.Type
			menu.Type = &val
		}
		if item.OrderSeq != 0 {
			val := int(item.OrderSeq)
			menu.OrderSeq = &val
		}
		if item.IdxNo != 0 {
			val := int(item.IdxNo)
			menu.IdxNo = &val
		}
		if item.DictSeq != 0 {
			val := int(item.DictSeq)
			menu.DictSeq = &val
		}
		menu.RowVersion = item.RowVersion

		menus = append(menus, menu)
	}

	data, err := h.menusSvc.MenuA(ctx, menus)
	if err != nil {
		h.log.Error("MenuA failed", zap.Error(err))
		if batchErr, ok := err.(*domain.BatchSaveError); ok {
			return utils.ErrorWithDataResponse[pb.Response](batchErr.Message, batchErr.Details), nil
		}
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}

func (h *MenuHandler) MenuU(ctx context.Context, req *pb.MenuURequest) (*pb.Response, error) {
	userSeq, _ := ctx.Value("user_seq").(string)
	var menus []domain.ERPMenus
	for _, item := range req.Result {
		menu := domain.ERPMenus{
			Id:            int(item.Id),
			MenuRootId:    int(item.MenuRootId),
			MenuSubRootId: int(item.MenuSubRootId),
		}

		if userSeq != "" {
			menu.UpdatedBy = userSeq
		} else if item.UpdatedBy != "" {
			menu.UpdatedBy = item.UpdatedBy
		}

		if item.UpdatedAt != "" {
			val := item.UpdatedAt
			menu.UpdatedAt = &val
		}
		if item.Key != "" {
			val := item.Key
			menu.Key = &val
		}
		if item.Label != "" {
			val := item.Label
			menu.Label = &val
		}
		if item.Link != "" {
			val := item.Link
			menu.Link = &val
		}
		if item.Type != "" {
			val := item.Type
			menu.Type = &val
		}
		if item.OrderSeq != 0 {
			val := int(item.OrderSeq)
			menu.OrderSeq = &val
		}
		if item.IdxNo != 0 {
			val := int(item.IdxNo)
			menu.IdxNo = &val
		}
		if item.DictSeq != 0 {
			val := int(item.DictSeq)
			menu.DictSeq = &val
		}
		menu.RowVersion = item.RowVersion

		menus = append(menus, menu)
	}

	data, err := h.menusSvc.MenuU(ctx, menus)
	if err != nil {
		h.log.Error("MenuU failed", zap.Error(err))
		if batchErr, ok := err.(*domain.BatchSaveError); ok {
			return utils.ErrorWithDataResponse[pb.Response](batchErr.Message, batchErr.Details), nil
		}
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}

func (h *MenuHandler) MenuD(ctx context.Context, req *pb.MenuDRequest) (*pb.Response, error) {
	var menus []domain.ERPMenus
	for _, item := range req.Result {
		menus = append(menus, domain.ERPMenus{
			Id:         int(item.Id),
			RowVersion: item.RowVersion,
		})
	}

	data, err := h.menusSvc.MenuD(ctx, menus)
	if err != nil {
		h.log.Error("MenuD failed", zap.Error(err))
		if batchErr, ok := err.(*domain.BatchSaveError); ok {
			return utils.ErrorWithDataResponse[pb.Response](batchErr.Message, batchErr.Details), nil
		}
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}

func (h *MenuHandler) MenuQ(ctx context.Context, req *pb.MenuQRequest) (*pb.Response, error) {
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

	data, pageInfo, err := h.menusSvc.MenuQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	pageStr := ""
	if pageInfo != nil {
		if b, err := json.Marshal(pageInfo); err == nil {
			pageStr = string(b)
		}
	}

	return utils.SuccessResponse[pb.Response]("Truy vấn thành công", data, pageStr), nil
}
