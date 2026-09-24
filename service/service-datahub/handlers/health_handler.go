package handlers

import (
	"net/http"
	"time"

	"service-datahub/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db        *gorm.DB
	startTime time.Time
}

func NewHealthHandler(db *gorm.DB) *HealthHandler {
	return &HealthHandler{
		db:        db,
		startTime: time.Now(),
	}
}

func (h *HealthHandler) HealthCheck(c *gin.Context) {
	dbStatus := "connected"
	if sqlDB, err := h.db.DB(); err != nil || sqlDB.Ping() != nil {
		dbStatus = "disconnected"
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Data: gin.H{
			"status":      "running",
			"database":    dbStatus,
			"uptime":      time.Since(h.startTime).String(),
			"server_time": time.Now().Format(time.RFC3339),
			"service":     "service-datahub",
			"version":     "1.0.0",
		},
	})
}
