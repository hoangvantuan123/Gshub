package system

import (
	"fmt"
	"net/http"
	"strings"

	"service-datahub/models"
	"service-datahub/services/system/role_perm"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type RolePermHandler struct {
	rolePermService *role_perm.RolePermService
	logger          *zap.Logger
}

func NewRolePermHandler(rolePermService *role_perm.RolePermService, logger *zap.Logger) *RolePermHandler {
	return &RolePermHandler{
		rolePermService: rolePermService,
		logger:          logger,
	}
}

// ─── QUERY USERS IN ROLE (Q) ───
func (h *RolePermHandler) UserRoleQ(c *gin.Context) {
	var body map[string]interface{}
	_ = c.ShouldBindJSON(&body)

	var gid string
	if resVal, ok := body["result"]; ok && resVal != nil {
		if resMap, ok := resVal.(map[string]interface{}); ok {
			for k, v := range resMap {
				lk := strings.ToLower(k)
				if lk == "groupid" || lk == "roleid" {
					gid = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	for k, v := range body {
		lk := strings.ToLower(k)
		if gid == "" && (lk == "groupid" || lk == "roleid") {
			gid = fmt.Sprintf("%v", v)
		}
	}
	if gid == "" {
		gid = c.Query("groupId")
		if gid == "" {
			gid = c.Query("roleId")
		}
	}

	users, err := h.rolePermService.QueryUsersInRole(c.Request.Context(), gid)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: users})
}

// ─── ASSIGN USERS TO ROLE (A) ───
func (h *RolePermHandler) UserRoleA(c *gin.Context) {
	var req struct {
		GroupId string   `json:"groupId"`
		UserIds []string `json:"userIds"`
		Result  struct {
			GroupId string   `json:"groupId"`
			UserIds []string `json:"userIds"`
		} `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	gid := req.Result.GroupId
	if gid == "" {
		gid = req.GroupId
	}
	uids := req.Result.UserIds
	if len(uids) == 0 {
		uids = req.UserIds
	}

	createdBy := ""
	if uid, ok := c.Get("user_id"); ok {
		createdBy, _ = uid.(string)
	}

	err := h.rolePermService.AssignUsersToRole(c.Request.Context(), gid, uids, createdBy)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: gin.H{"assigned": true}})
}

// ─── REMOVE USERS FROM ROLE (D) ───
func (h *RolePermHandler) UserRoleD(c *gin.Context) {
	var req struct {
		GroupId string   `json:"groupId"`
		UserIds []string `json:"userIds"`
		Result  struct {
			GroupId string   `json:"groupId"`
			UserIds []string `json:"userIds"`
		} `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	gid := req.Result.GroupId
	if gid == "" {
		gid = req.GroupId
	}
	uids := req.Result.UserIds
	if len(uids) == 0 {
		uids = req.UserIds
	}

	err := h.rolePermService.RemoveUsersFromRole(c.Request.Context(), gid, uids)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: gin.H{"deleted": true}})
}

// ─── QUERY MENU ROLES (Q) ───
func (h *RolePermHandler) MenuRoleQ(c *gin.Context) {
	var body map[string]interface{}
	_ = c.ShouldBindJSON(&body)

	var gid, rmid string
	if resVal, ok := body["result"]; ok && resVal != nil {
		if resMap, ok := resVal.(map[string]interface{}); ok {
			for k, v := range resMap {
				lk := strings.ToLower(k)
				if lk == "groupid" || lk == "roleid" {
					gid = fmt.Sprintf("%v", v)
				}
				if lk == "rootmenuid" || lk == "menurootid" || lk == "rootid" {
					rmid = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	for k, v := range body {
		lk := strings.ToLower(k)
		if gid == "" && (lk == "groupid" || lk == "roleid") {
			gid = fmt.Sprintf("%v", v)
		}
		if rmid == "" && (lk == "rootmenuid" || lk == "menurootid" || lk == "rootid") {
			rmid = fmt.Sprintf("%v", v)
		}
	}
	if gid == "" {
		gid = c.Query("groupId")
		if gid == "" {
			gid = c.Query("roleId")
		}
	}
	if rmid == "" {
		rmid = c.Query("rootMenuId")
		if rmid == "" {
			rmid = c.Query("menuRootId")
		}
	}

	menus, err := h.rolePermService.QueryMenuRoles(c.Request.Context(), gid, rmid)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: menus})
}

// ─── SAVE MENU ROLES (U) ───
func (h *RolePermHandler) MenuRoleU(c *gin.Context) {
	var req struct {
		GroupId     string                         `json:"groupId"`
		Permissions []role_perm.MenuRoleAssignment `json:"permissions"`
		Result      struct {
			GroupId     string                         `json:"groupId"`
			Permissions []role_perm.MenuRoleAssignment `json:"permissions"`
		} `json:"result"`
	}
	_ = c.ShouldBindJSON(&req)

	gid := req.Result.GroupId
	if gid == "" {
		gid = req.GroupId
	}
	perms := req.Result.Permissions
	if len(perms) == 0 {
		perms = req.Permissions
	}

	updatedBy := ""
	if uid, ok := c.Get("user_id"); ok {
		updatedBy, _ = uid.(string)
	}

	err := h.rolePermService.SaveMenuRoles(c.Request.Context(), gid, perms, updatedBy)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: gin.H{"saved": true}})
}

// ─── QUERY ROOT MENU ROLES (Q) ───
func (h *RolePermHandler) RootMenuRoleQ(c *gin.Context) {
	var body map[string]interface{}
	_ = c.ShouldBindJSON(&body)

	var gid string
	if resVal, ok := body["result"]; ok && resVal != nil {
		if resMap, ok := resVal.(map[string]interface{}); ok {
			for k, v := range resMap {
				lk := strings.ToLower(k)
				if lk == "groupid" || lk == "roleid" {
					gid = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	for k, v := range body {
		lk := strings.ToLower(k)
		if gid == "" && (lk == "groupid" || lk == "roleid") {
			gid = fmt.Sprintf("%v", v)
		}
	}
	if gid == "" {
		gid = c.Query("groupId")
		if gid == "" {
			gid = c.Query("roleId")
		}
	}

	rootMenus, err := h.rolePermService.QueryRootMenuRoles(c.Request.Context(), gid)
	if err != nil {
		c.JSON(http.StatusOK, models.ApiResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.ApiResponse{Success: true, Message: "2000", Data: rootMenus})
}

