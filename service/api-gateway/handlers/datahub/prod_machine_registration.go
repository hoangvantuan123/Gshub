package datahub

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"

	"github.com/gin-gonic/gin"
)

func ProdMachineRegistration(pool *grpcclient.Pool, operation string) gin.HandlerFunc {
	return h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.ProdMachineRegistrationService/ProdMachineRegistration"+operation)
}
