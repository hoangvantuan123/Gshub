package lookup_codehelp

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// CodeHelpQ (v6) - Tra cứu CodeHelp chung toàn hệ thống
func CodeHelpQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}

// CodeHelpCmnQ (v6) - Đầu API CodeHelp dùng chung toàn hệ thống (Common CodeHelp Engine)
func CodeHelpCmnQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}

// SysAttrGroupH (v6) - Tra cứu nhóm thuộc tính
func SysAttrGroupH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}

// PermActionsH (v6) - Tra cứu hành động/nút
func PermActionsH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}

// PermFieldsH (v6) - Tra cứu trường dữ liệu
func PermFieldsH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}

// PermScopesH (v6) - Tra cứu phạm vi dữ liệu
func PermScopesH(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.DataHubService/QueryCodeHelp")
}
