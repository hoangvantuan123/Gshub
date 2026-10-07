package system

import (
	"encoding/json"
	"net/http"

	"service-datahub/models"
	"service-datahub/services/system/role_group"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type RoleGroupHandler struct {
	roleGroupService *role_group.RoleGroupService
	logger           *zap.Logger
}

func NewRoleGroupHandler(roleGroupService *role_group.RoleGroupService, logger *zap.Logger) *RoleGroupHandler {
	return &RoleGroupHandler{
		roleGroupService: roleGroupService,
		logger:           logger,
	}
}

// ─── ROLE GROUP QUERY (Q) ───
func (h *RoleGroupHandler) RoleGroupQ(c *gin.Context) {
	var req struct {
		Result json.RawMessage `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	var filter struct {
		Keyword string `json:"keyword"`
		Name    string `json:"name"`
	}
	if len(req.Result) > 0 {
		_ = json.Unmarshal(req.Result, &filter)
	}

	kw := filter.Keyword
	if kw == "" {
		kw = filter.Name
	}
	if kw == "" {
		kw = c.Query("keyword")
	}

	list, err := h.roleGroupService.QueryRoleGroups(c.Request.Context(), kw)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: list})
}

// ─── ROLE GROUP INSERT (A) ───
func (h *RoleGroupHandler) RoleGroupA(c *gin.Context) {
	var req struct {
		Result json.RawMessage `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	var items []role_group.RoleGroupItem
	if len(req.Result) > 0 {
		if req.Result[0] == '[' {
			_ = json.Unmarshal(req.Result, &items)
		} else {
			var single role_group.RoleGroupItem
			if err := json.Unmarshal(req.Result, &single); err == nil {
				items = append(items, single)
			}
		}
	}

	inserted, err := h.roleGroupService.AddRoleGroups(c.Request.Context(), items)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: inserted})
}

// ─── ROLE GROUP UPDATE (U) ───
func (h *RoleGroupHandler) RoleGroupU(c *gin.Context) {
	var req struct {
		Result json.RawMessage `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	var items []role_group.RoleGroupItem
	if len(req.Result) > 0 {
		if req.Result[0] == '[' {
			_ = json.Unmarshal(req.Result, &items)
		} else {
			var single role_group.RoleGroupItem
			if err := json.Unmarshal(req.Result, &single); err == nil {
				items = append(items, single)
			}
		}
	}

	updated, err := h.roleGroupService.UpdateRoleGroups(c.Request.Context(), items)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: updated})
}

// ─── ROLE GROUP DELETE (D) ───
func (h *RoleGroupHandler) RoleGroupD(c *gin.Context) {
	var req struct {
		Ids    []string `json:"ids"`
		Result struct {
			Id string `json:"Id"`
		} `json:"result"`
		Id string `json:"Id"`
	}
	_ = c.ShouldBindJSON(&req)

	ids := req.Ids
	if len(ids) == 0 {
		id := req.Result.Id
		if id == "" {
			id = req.Id
		}
		if id == "" {
			id = c.Query("id")
		}
		if id != "" {
			ids = append(ids, id)
		}
	}

	err := h.roleGroupService.DeleteRoleGroups(c.Request.Context(), ids)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: gin.H{"deleted": true}})
}
