package technique

import (
	"context"

	domain "server-core/internal/models/technique"
	tblGrpSvc "server-core/internal/service/technique/tbl_grp"
	tblGrpItemSvc "server-core/internal/service/technique/tbl_grp_item"
	tblGrpPermSvc "server-core/internal/service/technique/tbl_grp_perm"
	tblGrpPermRoleSvc "server-core/internal/service/technique/tbl_grp_perm_role"
	"server-core/internal/utils"

	pb_tbl_grp "server-core/proto/users/technique/tbl_grp"
	pb_tbl_grp_item "server-core/proto/users/technique/tbl_grp_item"
	pb_tbl_grp_perm "server-core/proto/users/technique/tbl_grp_perm"
	pb_tbl_grp_perm_role "server-core/proto/users/technique/tbl_grp_perm_role"
)

type TechniqueHandler struct {
	pb_tbl_grp.UnimplementedTblGrpServiceServer
	pb_tbl_grp_item.UnimplementedTblGrpItemServiceServer
	pb_tbl_grp_perm.UnimplementedTblGrpPermServiceServer
	pb_tbl_grp_perm_role.UnimplementedTblGrpPermRoleServiceServer

	tblGrpSvc         *tblGrpSvc.TblGrpService
	tblGrpItemSvc     *tblGrpItemSvc.TblGrpItemService
	tblGrpPermSvc     *tblGrpPermSvc.TblGrpPermService
	tblGrpPermRoleSvc *tblGrpPermRoleSvc.TblGrpPermRoleService
}

func NewTechniqueHandler(
	grp *tblGrpSvc.TblGrpService,
	item *tblGrpItemSvc.TblGrpItemService,
	perm *tblGrpPermSvc.TblGrpPermService,
	role *tblGrpPermRoleSvc.TblGrpPermRoleService,
) *TechniqueHandler {
	return &TechniqueHandler{
		tblGrpSvc:         grp,
		tblGrpItemSvc:     item,
		tblGrpPermSvc:     perm,
		tblGrpPermRoleSvc: role,
	}
}

// ---------------------------------------------------------------------------
// 1. TblGrp
// ---------------------------------------------------------------------------

func (h *TechniqueHandler) TblGrpA(ctx context.Context, req *pb_tbl_grp.TblGrpARequest) (*pb_tbl_grp.Response, error) {
	var list []domain.ERPTblGrp
	for _, r := range req.Result {
		idx := int(r.IdxNo)
		tblName := r.TableName
		list = append(list, domain.ERPTblGrp{
			IdxNo:     &idx,
			KeyCode:   r.KeyCode,
			TableName: &tblName,
		})
	}
	res, err := h.tblGrpSvc.TblGrpA(ctx, list)
	if err != nil {
		return utils.ErrorResponseFromErr[pb_tbl_grp.Response](err), nil
	}
	return utils.SuccessResponse[pb_tbl_grp.Response]("Thêm mới thành công", res), nil
}

func (h *TechniqueHandler) TblGrpU(ctx context.Context, req *pb_tbl_grp.TblGrpURequest) (*pb_tbl_grp.Response, error) {
	return utils.SuccessResponse[pb_tbl_grp.Response]("Cập nhật thành công", []interface{}{}), nil
}

func (h *TechniqueHandler) TblGrpD(ctx context.Context, req *pb_tbl_grp.TblGrpDRequest) (*pb_tbl_grp.Response, error) {
	var ids []string
	for _, r := range req.Result {
		if r.IdSeq != "" {
			ids = append(ids, r.IdSeq)
		}
	}
	res, err := h.tblGrpSvc.TblGrpD(ctx, ids)
	if err != nil {
		return utils.ErrorResponseFromErr[pb_tbl_grp.Response](err), nil
	}
	return utils.SuccessResponse[pb_tbl_grp.Response]("Xóa thành công", res), nil
}

func (h *TechniqueHandler) TblGrpQ(ctx context.Context, req *pb_tbl_grp.TblGrpQRequest) (*pb_tbl_grp.Response, error) {
	filters := make(map[string]string)
	if req.Result != nil {
		if req.Result.KeyItem1 != "" {
			filters["KeyItem1"] = req.Result.KeyItem1
		}
		if req.Result.KeyItem2 != "" {
			filters["KeyItem2"] = req.Result.KeyItem2
		}
		if req.Result.KeyItem3 != "" {
			filters["KeyItem3"] = req.Result.KeyItem3
		}
	}
	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" {
				filters[k] = v
			}
		}
	}
	res, err := h.tblGrpSvc.TblGrpQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponseFromErr[pb_tbl_grp.Response](err), nil
	}
	return utils.SuccessResponse[pb_tbl_grp.Response]("Truy vấn thành công", res), nil
}

// ---------------------------------------------------------------------------
// 2. TblGrpItem
// ---------------------------------------------------------------------------

func (h *TechniqueHandler) TblGrpItemA(ctx context.Context, req *pb_tbl_grp_item.TblGrpItemARequest) (*pb_tbl_grp_item.Response, error) {
	var list []domain.ERPTblGrpItem
	for _, r := range req.Result {
		idx := int(r.IdxNo)
		grpSeq := r.TblGrpSeq
		list = append(list, domain.ERPTblGrpItem{
			IdxNo:     &idx,
			TblGrpSeq: &grpSeq,
			KeyCode:   r.KeyCode,
		})
	}
	res, err := h.tblGrpItemSvc.TblGrpItemA(ctx, list)
	if err != nil {
		return utils.ErrorResponseFromErr[pb_tbl_grp_item.Response](err), nil
	}
	return utils.SuccessResponse[pb_tbl_grp_item.Response]("Thêm mới thành công", res), nil
}

func (h *TechniqueHandler) TblGrpItemU(ctx context.Context, req *pb_tbl_grp_item.TblGrpItemURequest) (*pb_tbl_grp_item.Response, error) {
	return utils.SuccessResponse[pb_tbl_grp_item.Response]("Cập nhật thành công", []interface{}{}), nil
}

func (h *TechniqueHandler) TblGrpItemD(ctx context.Context, req *pb_tbl_grp_item.TblGrpItemDRequest) (*pb_tbl_grp_item.Response, error) {
	return utils.SuccessResponse[pb_tbl_grp_item.Response]("Xóa thành công", []interface{}{}), nil
}

func (h *TechniqueHandler) TblGrpItemQ(ctx context.Context, req *pb_tbl_grp_item.TblGrpItemQRequest) (*pb_tbl_grp_item.Response, error) {
	filters := make(map[string]string)
	if req.Result != nil {
		if req.Result.KeyItem1 != "" {
			filters["KeyItem1"] = req.Result.KeyItem1
		}
		if req.Result.KeyItem2 != "" {
			filters["KeyItem2"] = req.Result.KeyItem2
		}
		if req.Result.KeyItem3 != "" {
			filters["KeyItem3"] = req.Result.KeyItem3
		}
	}
	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" {
				filters[k] = v
			}
		}
	}
	res, err := h.tblGrpItemSvc.TblGrpItemQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponseFromErr[pb_tbl_grp_item.Response](err), nil
	}
	return utils.SuccessResponse[pb_tbl_grp_item.Response]("Truy vấn thành công", res), nil
}

// ---------------------------------------------------------------------------
// 3. TblGrpPerm
// ---------------------------------------------------------------------------

func (h *TechniqueHandler) TblGrpPermA(ctx context.Context, req *pb_tbl_grp_perm.TblGrpPermARequest) (*pb_tbl_grp_perm.Response, error) {
	var list []domain.ERPTblGrpPerm
	for _, r := range req.Result {
		idx := int(r.IdxNo)
		name := r.TblGrpPermName
		list = append(list, domain.ERPTblGrpPerm{
			IdxNo:          &idx,
			TblGrpPermName: &name,
		})
	}
	res, err := h.tblGrpPermSvc.TblGrpPermA(ctx, list)
	if err != nil {
		return utils.ErrorResponseFromErr[pb_tbl_grp_perm.Response](err), nil
	}
	return utils.SuccessResponse[pb_tbl_grp_perm.Response]("Thêm mới thành công", res), nil
}

func (h *TechniqueHandler) TblGrpPermU(ctx context.Context, req *pb_tbl_grp_perm.TblGrpPermURequest) (*pb_tbl_grp_perm.Response, error) {
	return utils.SuccessResponse[pb_tbl_grp_perm.Response]("Cập nhật thành công", []interface{}{}), nil
}

func (h *TechniqueHandler) TblGrpPermD(ctx context.Context, req *pb_tbl_grp_perm.TblGrpPermDRequest) (*pb_tbl_grp_perm.Response, error) {
	var ids []string
	for _, r := range req.Result {
		if r.IdSeq != "" {
			ids = append(ids, r.IdSeq)
		}
	}
	res, err := h.tblGrpPermSvc.TblGrpPermD(ctx, ids)
	if err != nil {
		return utils.ErrorResponseFromErr[pb_tbl_grp_perm.Response](err), nil
	}
	return utils.SuccessResponse[pb_tbl_grp_perm.Response]("Xóa thành công", res), nil
}

func (h *TechniqueHandler) TblGrpPermQ(ctx context.Context, req *pb_tbl_grp_perm.TblGrpPermQRequest) (*pb_tbl_grp_perm.Response, error) {
	res, err := h.tblGrpPermSvc.TblGrpPermQ(ctx)
	if err != nil {
		return utils.ErrorResponseFromErr[pb_tbl_grp_perm.Response](err), nil
	}
	return utils.SuccessResponse[pb_tbl_grp_perm.Response]("Truy vấn thành công", res), nil
}

// ---------------------------------------------------------------------------
// 4. TblGrpPermRole
// ---------------------------------------------------------------------------

func (h *TechniqueHandler) TblGrpPermRoleA(ctx context.Context, req *pb_tbl_grp_perm_role.TblGrpPermRoleARequest) (*pb_tbl_grp_perm_role.Response, error) {
	var list []domain.ERPTblGrpPermRole
	for _, r := range req.Result {
		idx := int(r.IdxNo)
		permSeq := r.TblGrpPermSeq
		grpSeq := r.TblGrpSeq
		itemSeq := r.TblGrpItemSeq
		tRole := r.TypeRole
		list = append(list, domain.ERPTblGrpPermRole{
			IdxNo:         &idx,
			TblGrpPermSeq: &permSeq,
			TblGrpSeq:     &grpSeq,
			TblGrpItemSeq: &itemSeq,
			TypeRole:      &tRole,
			View:          r.View,
			Edit:          r.Edit,
		})
	}
	res, err := h.tblGrpPermRoleSvc.TblGrpPermRoleA(ctx, list)
	if err != nil {
		return utils.ErrorResponseFromErr[pb_tbl_grp_perm_role.Response](err), nil
	}
	return utils.SuccessResponse[pb_tbl_grp_perm_role.Response]("Thêm mới thành công", res), nil
}

func (h *TechniqueHandler) TblGrpPermRoleU(ctx context.Context, req *pb_tbl_grp_perm_role.TblGrpPermRoleURequest) (*pb_tbl_grp_perm_role.Response, error) {
	return utils.SuccessResponse[pb_tbl_grp_perm_role.Response]("Cập nhật thành công", []interface{}{}), nil
}

func (h *TechniqueHandler) TblGrpPermRoleD(ctx context.Context, req *pb_tbl_grp_perm_role.TblGrpPermRoleDRequest) (*pb_tbl_grp_perm_role.Response, error) {
	return utils.SuccessResponse[pb_tbl_grp_perm_role.Response]("Xóa thành công", []interface{}{}), nil
}

func (h *TechniqueHandler) TblGrpPermRoleQ(ctx context.Context, req *pb_tbl_grp_perm_role.TblGrpPermRoleQRequest) (*pb_tbl_grp_perm_role.Response, error) {
	filters := make(map[string]interface{})
	if req.Result != nil {
		if req.Result.KeyItem1 != "" {
			filters["KeyItem1"] = req.Result.KeyItem1
		}
		if req.Result.KeyItem2 != "" {
			filters["KeyItem2"] = req.Result.KeyItem2
		}
		if req.Result.KeyItem3 != "" {
			filters["KeyItem3"] = req.Result.KeyItem3
		}
	}
	if req.Metadata != nil {
		for k, v := range req.Metadata {
			if v != "" {
				filters[k] = v
			}
		}
	}
	res, err := h.tblGrpPermRoleSvc.TblGrpPermRoleQ(ctx, filters)
	if err != nil {
		return utils.ErrorResponseFromErr[pb_tbl_grp_perm_role.Response](err), nil
	}
	return utils.SuccessResponse[pb_tbl_grp_perm_role.Response]("Truy vấn thành công", res), nil
}
