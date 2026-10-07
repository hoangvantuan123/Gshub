package system

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"service-datahub/models"
	"service-datahub/services/system/menu"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type MenuHandler struct {
	menuService *menu.MenuService
	logger      *zap.Logger
}

func NewMenuHandler(menuService *menu.MenuService, logger *zap.Logger) *MenuHandler {
	return &MenuHandler{
		menuService: menuService,
		logger:      logger,
	}
}

// ─── QUERY MENUS (Q) ───
func (h *MenuHandler) MenuQ(c *gin.Context) {
	var body map[string]interface{}
	_ = c.ShouldBindJSON(&body)

	var rootId, mType string
	if resVal, ok := body["result"]; ok && resVal != nil {
		if resMap, ok := resVal.(map[string]interface{}); ok {
			for k, v := range resMap {
				lk := strings.ToLower(k)
				if lk == "menurootid" || lk == "rootmenuid" || lk == "rootid" {
					rootId = fmt.Sprintf("%v", v)
				}
				if lk == "menutype" || lk == "type" {
					mType = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	for k, v := range body {
		lk := strings.ToLower(k)
		if rootId == "" && (lk == "menurootid" || lk == "rootmenuid" || lk == "rootid") {
			rootId = fmt.Sprintf("%v", v)
		}
		if mType == "" && (lk == "menutype" || lk == "type") {
			mType = fmt.Sprintf("%v", v)
		}
	}
	if rootId == "" {
		rootId = c.Query("menuRootId")
		if rootId == "" {
			rootId = c.Query("rootMenuId")
		}
	}
	if mType == "" {
		mType = c.Query("menuType")
		if mType == "" {
			mType = c.Query("type")
		}
	}

	list, err := h.menuService.QueryMenus(c.Request.Context(), rootId, mType)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: list})
}

// ─── ADD MENUS (A) ───
func (h *MenuHandler) MenuA(c *gin.Context) {
	var req struct {
		Result json.RawMessage `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	var items []menu.MenuItem
	if len(req.Result) > 0 {
		if req.Result[0] == '[' {
			_ = json.Unmarshal(req.Result, &items)
		} else {
			var single menu.MenuItem
			if err := json.Unmarshal(req.Result, &single); err == nil {
				items = append(items, single)
			}
		}
	}

	inserted, err := h.menuService.AddMenus(c.Request.Context(), items)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: inserted})
}

// ─── UPDATE MENUS (U) ───
func (h *MenuHandler) MenuU(c *gin.Context) {
	var req struct {
		Result json.RawMessage `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	var items []menu.MenuItem
	if len(req.Result) > 0 {
		if req.Result[0] == '[' {
			_ = json.Unmarshal(req.Result, &items)
		} else {
			var single menu.MenuItem
			if err := json.Unmarshal(req.Result, &single); err == nil {
				items = append(items, single)
			}
		}
	}

	updated, err := h.menuService.UpdateMenus(c.Request.Context(), items)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: updated})
}

// ─── DELETE MENUS (D) ───
func (h *MenuHandler) MenuD(c *gin.Context) {
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

	err := h.menuService.DeleteMenus(c.Request.Context(), ids)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: gin.H{"deleted": true}})
}
