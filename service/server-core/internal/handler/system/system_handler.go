package system

import (
	sysAttrGroupSvc "server-core/internal/service/system/sys_attr_group"
	sysAttrItemSvc "server-core/internal/service/system/sys_attr_item"
	pb_sys_attr_groups "server-core/proto/users/system/sys_attr_groups"
	pb_sys_attr_items "server-core/proto/users/system/sys_attr_items"

	"go.uber.org/zap"
)

// SystemHandler kết hợp xử lý cả SysAttrGroups và SysAttrItems cho gRPC
type SystemHandler struct {
	*SysAttrGroupHandler
	*SysAttrItemHandler
}

// NewSystemHandler khởi tạo SystemHandler tổng hợp
func NewSystemHandler(
	groupSvc *sysAttrGroupSvc.SysAttrGroupsService,
	itemSvc *sysAttrItemSvc.SysAttrItemsService,
	log *zap.Logger,
) *SystemHandler {
	return &SystemHandler{
		SysAttrGroupHandler: NewSysAttrGroupHandler(groupSvc, log),
		SysAttrItemHandler:  NewSysAttrItemHandler(itemSvc, log),
	}
}

// Interface check đảm bảo implement đầy đủ cả 2 gRPC Server
var _ pb_sys_attr_groups.SysAttrGroupsServiceServer = (*SystemHandler)(nil)
var _ pb_sys_attr_items.SysAttrItemsServiceServer = (*SystemHandler)(nil)
