package datahub

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/h"
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

func ProdMachineCatalog(pool *grpcclient.Pool, operation string) gin.HandlerFunc {
	forward := h.Handle(pool, config.Cfg.HostGRPCDatahub, "/datahub.ProdMachineCatalogService/ProdMachineCatalog"+operation)
	return func(c *gin.Context) {
		var body interface{}
		if c.Request.Method == http.MethodGet {
			filters := map[string]string{}
			for k, values := range c.Request.URL.Query() {
				if len(values) > 0 {
					filters[k] = values[0]
				}
			}
			body = filters
		} else {
			data, err := io.ReadAll(c.Request.Body)
			if err != nil {
				c.AbortWithStatusJSON(400, gin.H{"success": false, "message": "Không thể đọc dữ liệu"})
				return
			}
			if len(bytes.TrimSpace(data)) == 0 && operation == "Q" {
				data = []byte(`{}`)
			}
			if err := json.Unmarshal(data, &body); err != nil || body == nil {
				c.AbortWithStatusJSON(400, gin.H{"success": false, "message": "JSON không hợp lệ"})
				return
			}
			if operation == "D" {
				if ids, ok := body.([]interface{}); ok {
					body = map[string]interface{}{"idSeqs": ids}
				}
			}
		}
		encoded, err := json.Marshal(body)
		if err != nil {
			c.AbortWithStatusJSON(400, gin.H{"success": false, "message": "JSON không hợp lệ"})
			return
		}
		c.Request.Body = io.NopCloser(bytes.NewReader(encoded))
		forward(c)
	}
}
