package technique

import (
	tblGrpSvc "server-core/internal/service/technique/tbl_grp"
	tblGrpItemSvc "server-core/internal/service/technique/tbl_grp_item"
	tblGrpPermSvc "server-core/internal/service/technique/tbl_grp_perm"
	tblGrpPermRoleSvc "server-core/internal/service/technique/tbl_grp_perm_role"
)

type TechniqueHandler struct {
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
