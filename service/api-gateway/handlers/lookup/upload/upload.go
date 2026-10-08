package lookup_upload

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

// UploadLookQ (v2) -> TempFileH
func UploadLookQ(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.upload.help_temp_file.UploadService/TempFileH")
}

// UploadHelp (v6) -> TempFileH
func UploadHelp(pool *grpcclient.Pool) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCLookup, "/lookup.upload.help_temp_file.UploadService/TempFileH")
}
