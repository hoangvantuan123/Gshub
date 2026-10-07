package system

import (
	"encoding/json"
	"net/http"

	"service-datahub/models"
	"service-datahub/services/system/root_menu"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type RootMenuHandler struct {
	rootMenuService *root_menu.RootMenuService
	logger          *zap.Logger
}

func NewRootMenuHandler(rootMenuService *root_menu.RootMenuService, logger *zap.Logger) *RootMenuHandler {
	return &RootMenuHandler{
		rootMenuService: rootMenuService,
		logger:          logger,
	}
}

// ─── QUERY ROOT MENUS (Q) ───
func (h *RootMenuHandler) RootMenuQ(c *gin.Context) {
	list, err := h.rootMenuService.QueryRootMenus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: list})
}

// ─── ADD ROOT MENUS (A) ───
func (h *RootMenuHandler) RootMenuA(c *gin.Context) {
	var req struct {
		Result json.RawMessage `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	var items []root_menu.RootMenuItem
	if len(req.Result) > 0 {
		if req.Result[0] == '[' {
			_ = json.Unmarshal(req.Result, &items)
		} else {
			var single root_menu.RootMenuItem
			if err := json.Unmarshal(req.Result, &single); err == nil {
				items = append(items, single)
			}
		}
	}

	inserted, err := h.rootMenuService.AddRootMenus(c.Request.Context(), items)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: inserted})
}

// ─── UPDATE ROOT MENUS (U) ───
func (h *RootMenuHandler) RootMenuU(c *gin.Context) {
	var req struct {
		Result json.RawMessage `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	var items []root_menu.RootMenuItem
	if len(req.Result) > 0 {
		if req.Result[0] == '[' {
			_ = json.Unmarshal(req.Result, &items)
		} else {
			var single root_menu.RootMenuItem
			if err := json.Unmarshal(req.Result, &single); err == nil {
				items = append(items, single)
			}
		}
	}

	updated, err := h.rootMenuService.UpdateRootMenus(c.Request.Context(), items)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: updated})
}

// ─── DELETE ROOT MENUS (D) ───
func (h *RootMenuHandler) RootMenuD(c *gin.Context) {
	var req struct {
		Ids    []string `json:"ids"`
		Result struct {
			Id  string `json:"Id"`
			Key string `json:"Key"`
		} `json:"result"`
		Id  string `json:"Id"`
		Key string `json:"Key"`
	}
	_ = c.ShouldBindJSON(&req)

	ids := req.Ids
	if len(ids) == 0 {
		id := req.Result.Id
		if id == "" {
			id = req.Result.Key
		}
		if id == "" {
			id = req.Id
		}
		if id == "" {
			id = req.Key
		}
		if id != "" {
			ids = append(ids, id)
		}
	}

	err := h.rootMenuService.DeleteRootMenus(c.Request.Context(), ids)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: gin.H{"deleted": true}})
}
