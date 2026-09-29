package auth

import (
	"api-gateway/internal/grpcclient"

	auth_app "api-gateway/handlers/auth/app"
	auth_auth "api-gateway/handlers/auth/auth"
	auth_lang "api-gateway/handlers/auth/lang"
	auth_roles "api-gateway/handlers/auth/roles"
	auth_system "api-gateway/handlers/auth/system"
	auth_technique "api-gateway/handlers/auth/technique"

	"github.com/gin-gonic/gin"
)

func Register(v2 *gin.RouterGroup, pool *grpcclient.Pool) {
	// 1. Auth & Users (/api/v2/acc)
	acc := v2.Group("/acc")
	{
		acc.POST("/UPass2", auth_auth.UpdatePasswords(pool))
		acc.POST("/p2/login", auth_auth.Login(pool))
		acc.POST("/p2/loginApp", auth_auth.LoginApp(pool))
		acc.POST("/p2/change-password", auth_auth.ChangePass(pool))
		acc.POST("/p2/logout", auth_auth.Logout(pool))
		acc.POST("/UsersAuthA", auth_auth.UsersAuthA(pool))
		acc.POST("/UsersAuthU", auth_auth.UsersAuthU(pool))
		acc.POST("/UsersAuthD", auth_auth.UsersAuthD(pool))
		acc.POST("/UsersAuthQ", auth_auth.UsersAuthQ(pool))
		acc.POST("/UsersAuthUStatusAcc", auth_auth.UsersAuthUStatusAcc(pool))
		acc.POST("/LogLoginQ", auth_auth.LogLoginQ(pool))
		acc.POST("/LogLoginD", auth_auth.LogLoginD(pool))
	}

	// 2. Language (/api/v2/lang)
	lang := v2.Group("/lang")
	{
		lang.POST("/LangA", auth_lang.LangA(pool))
		lang.POST("/LangU", auth_lang.LangU(pool))
		lang.POST("/LangD", auth_lang.LangD(pool))
		lang.POST("/LangQ", auth_lang.LangQ(pool))
		lang.POST("/DictA", auth_lang.DictA(pool))
		lang.POST("/DictU", auth_lang.DictU(pool))
		lang.POST("/DictD", auth_lang.DictD(pool))
		lang.POST("/DictQ", auth_lang.DictQ(pool))
	}

	// 3. Menus (/api/v2/mssql/system-users & /api/v2/system-users & /api/v2/menu)
	regMenus := func(g *gin.RouterGroup) {
		g.POST("/MenuA", auth_roles.MenuA(pool))
		g.POST("/MenuU", auth_roles.MenuU(pool))
		g.POST("/MenuD", auth_roles.MenuD(pool))
		g.POST("/MenuQ", auth_roles.MenuQ(pool))
		g.POST("/RootMenuA", auth_roles.RootMenuA(pool))
		g.POST("/RootMenuU", auth_roles.RootMenuU(pool))
		g.POST("/RootMenuD", auth_roles.RootMenuD(pool))
		g.POST("/RootMenuQ", auth_roles.RootMenuQ(pool))
		g.POST("/root-menu-A", auth_roles.RootMenuA(pool))
		g.POST("/root-menu-U", auth_roles.RootMenuU(pool))
		g.POST("/root-menu-D", auth_roles.RootMenuD(pool))
		g.POST("/root-menu-Q", auth_roles.RootMenuQ(pool))
	}
	regMenus(v2.Group("/mssql/system-users")) // Legacy alias để tương thích frontend cũ
	regMenus(v2.Group("/system-users"))       // Chuẩn alias
	regMenus(v2.Group("/menu"))               // Chuẩn alias ngắn gọn

	// 4. Role & Techniques & Permissions (/api/v2/role)
	role := v2.Group("/role")
	{
		// Unified Role endpoints (1 A, 1 U, 1 D, 1 Q)
		role.POST("/RoleA", auth_roles.RoleA(pool))
		role.POST("/RoleU", auth_roles.RoleU(pool))
		role.POST("/RoleD", auth_roles.RoleD(pool))
		role.POST("/RoleQ", auth_roles.RoleQ(pool))

		role.POST("/MenuRoleQ", auth_roles.MenuRoleQ(pool))
		role.POST("/UserRoleQ", auth_roles.RoleUserQ(pool))
		role.POST("/RootMenuRoleQ", auth_roles.RootMenuRoleQ(pool))
		role.POST("/UserRoleU", auth_roles.RoleUserU(pool))
		role.POST("/UserRoleA", auth_roles.RoleUserA(pool))
		role.POST("/UserRoleD", auth_roles.RoleUserD(pool))
		role.POST("/RoleGroupQ", auth_roles.RoleGroupQ(pool)) // Mapping RoleGroup to RootMenu? Check Log.
		role.POST("/RoleGroupA", auth_roles.RoleGroupA(pool))
		role.POST("/RoleGroupU", auth_roles.RoleGroupU(pool))
		role.POST("/RoleGroupD", auth_roles.RoleGroupD(pool))

		// Techniques
		role.POST("/TblGrpA", auth_technique.TblGrpA(pool))
		role.POST("/TblGrpU", auth_technique.TblGrpU(pool))
		role.POST("/TblGrpD", auth_technique.TblGrpD(pool))
		role.POST("/TblGrpQ", auth_technique.TblGrpQ(pool))
		role.POST("/TblGrpItemA", auth_technique.TblGrpItemA(pool))
		role.POST("/TblGrpItemU", auth_technique.TblGrpItemU(pool))
		role.POST("/TblGrpItemD", auth_technique.TblGrpItemD(pool))
		role.POST("/TblGrpItemQ", auth_technique.TblGrpItemQ(pool))
		role.POST("/TblGrpPermA", auth_technique.TblGrpPermA(pool))
		role.POST("/TblGrpPermU", auth_technique.TblGrpPermU(pool))
		role.POST("/TblGrpPermD", auth_technique.TblGrpPermD(pool))
		role.POST("/TblGrpPermQ", auth_technique.TblGrpPermQ(pool))
		role.POST("/TblGrpPermRoleA", auth_technique.TblGrpPermRoleA(pool))
		role.POST("/TblGrpPermRoleU", auth_technique.TblGrpPermRoleU(pool))
		role.POST("/TblGrpPermRoleD", auth_technique.TblGrpPermRoleD(pool))
		role.POST("/TblGrpPermRoleQ", auth_technique.TblGrpPermRoleQ(pool))

		// Permissions (PermActions, PermScopes & PermFields)
		role.POST("/PermActionsA", auth_roles.PermActionsA(pool))
		role.POST("/PermActionsU", auth_roles.PermActionsU(pool))
		role.POST("/PermActionsD", auth_roles.PermActionsD(pool))
		role.POST("/PermActionsQ", auth_roles.PermActionsQ(pool))
		role.POST("/PermScopesA", auth_roles.PermScopesA(pool))
		role.POST("/PermScopesU", auth_roles.PermScopesU(pool))
		role.POST("/PermScopesD", auth_roles.PermScopesD(pool))
		role.POST("/PermScopesQ", auth_roles.PermScopesQ(pool))
		role.POST("/PermFieldsA", auth_roles.PermFieldsA(pool))
		role.POST("/PermFieldsU", auth_roles.PermFieldsU(pool))
		role.POST("/PermFieldsD", auth_roles.PermFieldsD(pool))
		role.POST("/PermFieldsQ", auth_roles.PermFieldsQ(pool))

		// Resource-level Permissions (PermResourceFields, PermResourceActions, PermResourceScopes)
		role.POST("/PermResourceFieldsA", auth_roles.PermResourceFieldsA(pool))
		role.POST("/PermResourceFieldsU", auth_roles.PermResourceFieldsU(pool))
		role.POST("/PermResourceFieldsD", auth_roles.PermResourceFieldsD(pool))
		role.POST("/PermResourceFieldsQ", auth_roles.PermResourceFieldsQ(pool))
		role.POST("/PermResourceActionsA", auth_roles.PermResourceActionsA(pool))
		role.POST("/PermResourceActionsU", auth_roles.PermResourceActionsU(pool))
		role.POST("/PermResourceActionsD", auth_roles.PermResourceActionsD(pool))
		role.POST("/PermResourceActionsQ", auth_roles.PermResourceActionsQ(pool))
		role.POST("/PermResourceScopesA", auth_roles.PermResourceScopesA(pool))
		role.POST("/PermResourceScopesU", auth_roles.PermResourceScopesU(pool))
		role.POST("/PermResourceScopesD", auth_roles.PermResourceScopesD(pool))
		role.POST("/PermResourceScopesQ", auth_roles.PermResourceScopesQ(pool))
	}

	// 5. App Group (/api/v2/app)
	appGroup := v2.Group("/app")
	{
		appGroup.POST("/ScreensA", auth_app.ScreenA(pool))
		appGroup.POST("/ScreensU", auth_app.ScreenU(pool))
		appGroup.POST("/ScreensD", auth_app.ScreenD(pool))
		appGroup.POST("/ScreensQ", auth_app.ScreenQ(pool))
		appGroup.POST("/TabsA", auth_app.TabA(pool))
		appGroup.POST("/TabsU", auth_app.TabU(pool))
		appGroup.POST("/TabsD", auth_app.TabD(pool))
		appGroup.POST("/TabsQ", auth_app.TabQ(pool))
		appGroup.POST("/AppGroupRoleA", auth_app.GroupRoleA(pool))
		appGroup.POST("/AppGroupRoleU", auth_app.GroupRoleU(pool))
		appGroup.POST("/AppGroupRoleD", auth_app.GroupRoleD(pool))
		appGroup.POST("/AppGroupRoleQ", auth_app.GroupRoleQ(pool))
		appGroup.POST("/AppUserRoleA", auth_app.UserRoleA(pool))
		appGroup.POST("/AppUserRoleU", auth_app.UserRoleU(pool))
		appGroup.POST("/AppUserRoleD", auth_app.UserRoleD(pool))
		appGroup.POST("/AppUserRoleQ", auth_app.UserRoleQ(pool))
	}

	// 6. System Attributes (/api/v2/system)
	sys := v2.Group("/system")
	{
		sys.POST("/SysAttrGroupsA", auth_system.SysAttrGroupsA(pool))
		sys.POST("/SysAttrGroupsU", auth_system.SysAttrGroupsU(pool))
		sys.POST("/SysAttrGroupsD", auth_system.SysAttrGroupsD(pool))
		sys.POST("/SysAttrGroupsQ", auth_system.SysAttrGroupsQ(pool))

		sys.POST("/SysAttrItemsA", auth_system.SysAttrItemsA(pool))
		sys.POST("/SysAttrItemsU", auth_system.SysAttrItemsU(pool))
		sys.POST("/SysAttrItemsD", auth_system.SysAttrItemsD(pool))
		sys.POST("/SysAttrItemsQ", auth_system.SysAttrItemsQ(pool))

		sys.POST("/PermActionsA", auth_roles.PermActionsA(pool))
		sys.POST("/PermActionsU", auth_roles.PermActionsU(pool))
		sys.POST("/PermActionsD", auth_roles.PermActionsD(pool))
		sys.POST("/PermActionsQ", auth_roles.PermActionsQ(pool))
	}
}
