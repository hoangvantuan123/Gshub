package app

import (
	"server-core/internal/database"
	handler_auth "server-core/internal/handler/auth"
	handler_lang "server-core/internal/handler/language"
	handler_roles "server-core/internal/handler/roles"
	handler_system "server-core/internal/handler/system"
	handler_tech "server-core/internal/handler/technique"

	authSvc "server-core/internal/service/auth"
	userAuthSvc "server-core/internal/service/auth/user"
	dictSvc "server-core/internal/service/language/dict"
	langSvc "server-core/internal/service/language/lang"
	actionPermSvc "server-core/internal/service/roles/action_perm"
	menuSvc "server-core/internal/service/roles/menu"
	permActionSvc "server-core/internal/service/roles/perm_action"
	permFieldSvc "server-core/internal/service/roles/perm_field"
	permResourceActionSvc "server-core/internal/service/roles/perm_resource_action"
	permResourceFieldSvc "server-core/internal/service/roles/perm_resource_field"
	permResourceScopeSvc "server-core/internal/service/roles/perm_resource_scope"
	permScopeSvc "server-core/internal/service/roles/perm_scope"
	roleGroupSvc "server-core/internal/service/roles/role_group"
	roleUserSvc "server-core/internal/service/roles/role_user"
	rootMenuSvc "server-core/internal/service/roles/root_menu"
	systemUserSvc "server-core/internal/service/roles/system_user"
	sysAuditSvc "server-core/internal/service/system"
	sysAttrGroupSvc "server-core/internal/service/system/sys_attr_group"
	sysAttrItemSvc "server-core/internal/service/system/sys_attr_item"
	tblGrpSvc "server-core/internal/service/technique/tbl_grp"
	tblGrpItemSvc "server-core/internal/service/technique/tbl_grp_item"
	tblGrpPermSvc "server-core/internal/service/technique/tbl_grp_perm"
	tblGrpPermRoleSvc "server-core/internal/service/technique/tbl_grp_perm_role"
	"server-core/internal/worker"

	"go.uber.org/zap"
	google_grpc "google.golang.org/grpc"

	pb_auth_login "server-core/proto/users/auth/login"
	pb_auth_log_login "server-core/proto/users/auth/log_login"
	pb_auth_users "server-core/proto/users/auth/users"
	pb_dict "server-core/proto/users/langs/dicts"
	pb_lang "server-core/proto/users/langs/langs"
	pb_menu "server-core/proto/users/roles/menu"
	pb_perm_actions "server-core/proto/users/roles/perm_actions"
	pb_perm_fields "server-core/proto/users/roles/perm_fields"
	pb_perm_resource_actions "server-core/proto/users/roles/perm_resource_actions"
	pb_perm_resource_fields "server-core/proto/users/roles/perm_resource_fields"
	pb_perm_resource_scopes "server-core/proto/users/roles/perm_resource_scopes"
	pb_perm_scopes "server-core/proto/users/roles/perm_scopes"
	pb_role "server-core/proto/users/roles/role"
	pb_root_menu "server-core/proto/users/roles/root_menu"
	pb_sys_attr_groups "server-core/proto/users/system/sys_attr_groups"
	pb_sys_attr_items "server-core/proto/users/system/sys_attr_items"
)

// AppContainer holds all the dependencies of the application
type AppContainer struct {
	Log *zap.Logger

	// Auth Handlers
	LoginHandler    *handler_auth.LoginHandler
	UserHandler     *handler_auth.UserHandler
	LogLoginHandler *handler_auth.LogLoginHandler

	// Language Handlers
	LangHandler *handler_lang.LangHandler
	DictHandler *handler_lang.DictHandler

	// System Handlers
	SysAttrGroupHandler *handler_system.SysAttrGroupHandler
	SysAttrItemHandler  *handler_system.SysAttrItemHandler

	// Roles Handlers
	MenuHandler               *handler_roles.MenuHandler
	RootMenuHandler           *handler_roles.RootMenuHandler
	RoleHandler               *handler_roles.RoleHandler
	PermActionHandler         *handler_roles.PermActionHandler
	PermFieldHandler          *handler_roles.PermFieldHandler
	PermScopeHandler          *handler_roles.PermScopeHandler
	PermResourceFieldHandler  *handler_roles.PermResourceFieldHandler
	PermResourceActionHandler *handler_roles.PermResourceActionHandler
	PermResourceScopeHandler  *handler_roles.PermResourceScopeHandler

	// Technique Handler
	TechniqueHandler *handler_tech.TechniqueHandler

	// Services for Middleware / Background workers
	AuditLogSvc *sysAuditSvc.AuditLogService
}

// NewAppContainer initializes all modules and their dependencies
func NewAppContainer(log *zap.Logger, wp *worker.Pool) (*AppContainer, error) {
	db := database.SqlxDB
	dbLogs := database.SqlxDBLogs
	if dbLogs == nil {
		dbLogs = db
	}

	// 1. Initialize all granular services
	auditLogSvc := sysAuditSvc.NewAuditLogService(dbLogs, log)

	loginService := authSvc.NewAuthService(db, dbLogs, wp, log)
	userService := userAuthSvc.NewUserAuthService(db)
	userService.SetAuditLogService(auditLogSvc)
	logLoginService := authSvc.NewLogLoginService(dbLogs)

	languageService := langSvc.NewLanguageService(db)
	dictionaryService := dictSvc.NewDictService(db)

	sysAttrGroupsService := sysAttrGroupSvc.NewSysAttrGroupsService(db)
	sysAttrItemsService := sysAttrItemSvc.NewSysAttrItemsService(db)

	permActionsService := permActionSvc.NewPermActionsService(db)
	permFieldsService := permFieldSvc.NewPermFieldsService(db)
	permScopesService := permScopeSvc.NewPermScopesService(db)

	permResourceFieldsService := permResourceFieldSvc.NewPermResourceFieldsService(db)
	permResourceActionsService := permResourceActionSvc.NewPermResourceActionsService(db)
	permResourceScopesService := permResourceScopeSvc.NewPermResourceScopesService(db)

	_ = systemUserSvc.NewSystemUsersService(db)
	_ = actionPermSvc.NewActionLevelPermsService(db)
	roleGroupService := roleGroupSvc.NewRoleGroupService(db)
	roleUsersService := roleUserSvc.NewRoleUsersService(db)
	menusService := menuSvc.NewMenusService(db)
	rootMenusService := rootMenuSvc.NewRootMenusService(db)

	tblGroupService := tblGrpSvc.NewTblGrpService(db)
	tblGroupItemService := tblGrpItemSvc.NewTblGrpItemService(db)
	tblGroupPermService := tblGrpPermSvc.NewTblGrpPermService(db)
	tblGroupPermRoleService := tblGrpPermRoleSvc.NewTblGrpPermRoleService(db)

	// 2. Initialize granular gRPC Handlers
	loginHandler := handler_auth.NewLoginHandler(loginService, log)
	userHandler := handler_auth.NewUserHandler(userService, log)
	logLoginHandler := handler_auth.NewLogLoginHandler(logLoginService, log)

	langHandler := handler_lang.NewLangHandler(languageService, log)
	dictHandler := handler_lang.NewDictHandler(dictionaryService, log)

	sysAttrGroupHandler := handler_system.NewSysAttrGroupHandler(sysAttrGroupsService, log)
	sysAttrItemHandler := handler_system.NewSysAttrItemHandler(sysAttrItemsService, log)

	menuHandler := handler_roles.NewMenuHandler(menusService, log)
	rootMenuHandler := handler_roles.NewRootMenuHandler(rootMenusService, log)
	roleHandler := handler_roles.NewRoleHandler(roleGroupService, roleUsersService, log)
	permActionHandler := handler_roles.NewPermActionHandler(permActionsService, log)
	permFieldHandler := handler_roles.NewPermFieldHandler(permFieldsService)
	permScopeHandler := handler_roles.NewPermScopeHandler(permScopesService)

	permResourceFieldHandler := handler_roles.NewPermResourceFieldHandler(permResourceFieldsService)
	permResourceActionHandler := handler_roles.NewPermResourceActionHandler(permResourceActionsService)
	permResourceScopeHandler := handler_roles.NewPermResourceScopeHandler(permResourceScopesService)

	techHandler := handler_tech.NewTechniqueHandler(tblGroupService, tblGroupItemService, tblGroupPermService, tblGroupPermRoleService)

	return &AppContainer{
		Log:                       log,
		LoginHandler:              loginHandler,
		UserHandler:               userHandler,
		LogLoginHandler:           logLoginHandler,
		LangHandler:               langHandler,
		DictHandler:               dictHandler,
		SysAttrGroupHandler:       sysAttrGroupHandler,
		SysAttrItemHandler:        sysAttrItemHandler,
		MenuHandler:               menuHandler,
		RootMenuHandler:           rootMenuHandler,
		RoleHandler:               roleHandler,
		PermActionHandler:         permActionHandler,
		PermFieldHandler:          permFieldHandler,
		PermScopeHandler:          permScopeHandler,
		PermResourceFieldHandler:  permResourceFieldHandler,
		PermResourceActionHandler: permResourceActionHandler,
		PermResourceScopeHandler:  permResourceScopeHandler,
		TechniqueHandler:          techHandler,
		AuditLogSvc:               auditLogSvc,
	}, nil
}

// RegisterServices registers all gRPC handlers to the server
func (c *AppContainer) RegisterServices(server *google_grpc.Server) {
	// 1. Module: Auth & Users
	pb_auth_login.RegisterLoginServiceServer(server, c.LoginHandler)
	pb_auth_users.RegisterUsersServiceServer(server, c.UserHandler)
	pb_auth_log_login.RegisterLogLoginServiceServer(server, c.LogLoginHandler)

	// 2. Module: Language & Dictionaries
	pb_lang.RegisterLangsServiceServer(server, c.LangHandler)
	pb_dict.RegisterDictsServiceServer(server, c.DictHandler)

	// 3. Module: Roles & Menus
	pb_menu.RegisterMenuServiceServer(server, c.MenuHandler)
	pb_root_menu.RegisterRootMenuServiceServer(server, c.RootMenuHandler)
	pb_role.RegisterRoleServiceServer(server, c.RoleHandler)
	pb_perm_actions.RegisterPermActionsServiceServer(server, c.PermActionHandler)
	pb_perm_fields.RegisterPermFieldsServiceServer(server, c.PermFieldHandler)
	pb_perm_scopes.RegisterPermScopesServiceServer(server, c.PermScopeHandler)

	// 3.1 Resource-level Permissions (Menu-bound)
	pb_perm_resource_fields.RegisterPermResourceFieldsServiceServer(server, c.PermResourceFieldHandler)
	pb_perm_resource_actions.RegisterPermResourceActionsServiceServer(server, c.PermResourceActionHandler)
	pb_perm_resource_scopes.RegisterPermResourceScopesServiceServer(server, c.PermResourceScopeHandler)

	// 4. Module: System (SysAttrGroups & SysAttrItems)
	pb_sys_attr_groups.RegisterSysAttrGroupsServiceServer(server, c.SysAttrGroupHandler)
	pb_sys_attr_items.RegisterSysAttrItemsServiceServer(server, c.SysAttrItemHandler)

	c.Log.Info("gRPC Modular Services Registration Successfully Finished")
}

