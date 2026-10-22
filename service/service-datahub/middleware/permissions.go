package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"
	"service-datahub/auth"
)

type reportPolicy struct {
	keys      []string
	operation string
}

func IsPublicUpdateMethod(method string) bool {
	switch method {
	case "UpdatePlanDetail", "PlanDetailU", "UpdateProdStatsDetail", "ProdStatsDetailU":
		return true
	}
	return false
}

func registrationPolicy(method string) (reportPolicy, bool) {
	if IsPublicUpdateMethod(method) {
		return reportPolicy{}, false
	}
	registration := []string{"report_registration"}
	plan := []string{"report_registration", "report_plan_query", "report_hanoi_gs1_plan", "report_quevo_gs5_plan", "report_summary_plan", "report_prod_machine_registration"}
	stat := []string{"report_registration", "report_stat_query", "report_hanoi_gs1_stat", "report_quevo_gs5_stat", "report_summary_stat", "report_prod_machine_registration"}
	masterQuery := []string{
		"report_registration",
		"report_plan_query",
		"report_stat_query",
		"report_hanoi_gs1_plan",
		"report_hanoi_gs1_stat",
		"report_quevo_gs5_plan",
		"report_quevo_gs5_stat",
		"report_summary_plan",
		"report_summary_stat",
		"report_prod_machine_registration",
	}
	policies := map[string]reportPolicy{
		"QueryPlanMaster":       {masterQuery, "Search"},
		"SavePlanRegistration":  {registration, "Create"},
		"DeletePlanMaster":      {registration, "Delete"},
		"QueryPlanDetail":       {plan, "Search"},
		"QueryProdStatsDetail":  {stat, "Search"},
		"AddPlanDetail":         {registration, "Create"},
		"DeletePlanDetail":      {registration, "Delete"},
		"AddProdStatsDetail":    {registration, "Create"},
		"DeleteProdStatsDetail": {registration, "Delete"},
	}
	policy, ok := policies[method]
	if !ok {
		policy, ok = remarkTypePolicy(method)
	}
	if !ok {
		policy, ok = machineCatalogPolicy(method)
	}
	if !ok {
		policy, ok = machineRegistrationPolicy(method)
	}
	return policy, ok
}

func machineRegistrationPolicy(method string) (reportPolicy, bool) {
	operations := map[string]string{
		"ProdMachineRegistrationA": "Create",
		"ProdMachineRegistrationD": "Delete",
		"ProdMachineRegistrationQ": "Search",
	}
	op, ok := operations[method]
	// This screen is a child of report registration. Keep its own permission key
	// when provisioned, while existing report-registration grants remain a fallback.
	return reportPolicy{
		keys:      []string{"report_prod_machine_registration", "report_registration"},
		operation: op,
	}, ok
}

func remarkTypePolicy(method string) (reportPolicy, bool) {
	operations := map[string]string{
		"ProdStatsRemarkTypeA": "Create", "ProdStatsRemarkTypeU": "Edit",
		"ProdStatsRemarkTypeD": "Delete", "ProdStatsRemarkTypeQ": "Search",
	}
	op, ok := operations[method]
	return reportPolicy{keys: []string{"report_prod_stats_remark_type"}, operation: op}, ok
}

func machineCatalogPolicy(method string) (reportPolicy, bool) {
	operations := map[string]string{
		"ProdMachineCatalogA": "Create", "ProdMachineCatalogU": "Edit",
		"ProdMachineCatalogD": "Delete", "ProdMachineCatalogQ": "Search",
	}
	op, ok := operations[method]
	keys := []string{"report_prod_machine_catalog"}
	if method == "ProdMachineCatalogQ" {
		keys = append(keys, "report_prod_machine_registration")
	}
	return reportPolicy{keys: keys, operation: op}, ok
}

func httpRegistrationPolicy(path string) (reportPolicy, bool) {
	if strings.HasSuffix(path, "/plan/update") || strings.HasSuffix(path, "/statistics/update") ||
		strings.HasSuffix(path, "/PlanDetailU") || strings.HasSuffix(path, "/ProdStatsDetailU") {
		return reportPolicy{}, false
	}
	if strings.HasPrefix(path, "/api/v2/report/prod-stats-remark-type/") {
		parts := strings.Split(path, "/")
		return remarkTypePolicy(parts[len(parts)-1])
	}
	if strings.HasPrefix(path, "/api/v2/report/prod-machine-catalog/") {
		parts := strings.Split(path, "/")
		return machineCatalogPolicy(parts[len(parts)-1])
	}
	if strings.HasPrefix(path, "/api/v2/report/prod-machine-registration/") {
		parts := strings.Split(path, "/")
		return machineRegistrationPolicy(parts[len(parts)-1])
	}
	aliases := map[string]string{
		"PlanMasterQ": "QueryPlanMaster", "query-master": "QueryPlanMaster",
		"PlanMasterD": "DeletePlanMaster", "delete-master": "DeletePlanMaster", ":reg_code": "DeletePlanMaster",
		"PlanRegistrationA": "SavePlanRegistration", "save": "SavePlanRegistration",
		"PlanDetailQ": "QueryPlanDetail", "query-detail": "QueryPlanDetail",
		"ProdStatsDetailQ": "QueryProdStatsDetail", "query-stats-detail": "QueryProdStatsDetail",
		"PlanDetailA": "AddPlanDetail", "PlanDetailD": "DeletePlanDetail",
		"ProdStatsDetailA": "AddProdStatsDetail", "ProdStatsDetailD": "DeleteProdStatsDetail",
	}
	if !strings.HasPrefix(path, "/api/v1/report/plan/") && !strings.HasPrefix(path, "/api/v2/report/plan/") && !strings.HasPrefix(path, "/api/v2/report/stat/") {
		return reportPolicy{}, false
	}
	parts := strings.Split(path, "/")
	return registrationPolicy(aliases[parts[len(parts)-1]])
}

func authorizeReport(ctx context.Context, db *gorm.DB, token string, policy reportPolicy) (context.Context, *auth.AuthenticatedUser, error) {
	if GlobalBlacklist.IsRevoked(auth.CleanBearerToken(token)) {
		return ctx, nil, status.Error(codes.Unauthenticated, "session revoked")
	}
	user, err := auth.AuthenticateUserWithToken(ctx, db, token)
	if err != nil || user == nil || user.UserSeq == "" {
		return ctx, nil, status.Error(codes.Unauthenticated, "valid login required")
	}
	if policy.operation == "Search" && len(policy.keys) == 0 {
		return auth.WithAuthenticatedUser(ctx, user), user, nil
	}
	allowed, err := auth.CheckMenuPermission(ctx, db, user, policy.keys, policy.operation)
	if err != nil {
		return ctx, nil, status.Error(codes.Unavailable, "permission lookup failed")
	}
	if !allowed {
		return ctx, nil, status.Error(codes.PermissionDenied, "operation is not permitted")
	}
	return auth.WithAuthenticatedUser(ctx, user), user, nil
}

func ReportPermissionMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		policy, protected := httpRegistrationPolicy(c.FullPath())
		if !protected {
			token := c.GetHeader("Authorization")
			if token != "" && db != nil {
				if user, err := auth.AuthenticateUserWithToken(c.Request.Context(), db, token); err == nil && user != nil {
					c.Set("user_id", user.UserId)
					c.Set("user_seq", user.UserSeq)
					c.Set("login", user.UserName)
				}
			}
			c.Next()
			return
		}
		ctx, user, err := authorizeReport(c.Request.Context(), db, c.GetHeader("Authorization"), policy)
		if err != nil {
			code := http.StatusForbidden
			switch status.Code(err) {
			case codes.Unauthenticated:
				code = http.StatusUnauthorized
			case codes.Unavailable:
				code = http.StatusServiceUnavailable
			}
			c.AbortWithStatusJSON(code, gin.H{"success": false, "message": status.Convert(err).Message()})
			return
		}
		c.Request = c.Request.WithContext(ctx)
		c.Set("user_id", user.UserId)
		c.Set("user_seq", user.UserSeq)
		c.Set("login", user.UserName)
		c.Next()
	}
}

func ReportPermissionInterceptor(db *gorm.DB) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		const prefix = "/datahub.DataHubService/"
		const remarkPrefix = "/datahub.ProdStatsRemarkTypeService/"
		const machinePrefix = "/datahub.ProdMachineCatalogService/"
		const machineRegistrationPrefix = "/datahub.ProdMachineRegistrationService/"
		if !strings.HasPrefix(info.FullMethod, prefix) && !strings.HasPrefix(info.FullMethod, remarkPrefix) && !strings.HasPrefix(info.FullMethod, machinePrefix) && !strings.HasPrefix(info.FullMethod, machineRegistrationPrefix) {
			return handler(ctx, req)
		}
		method := strings.TrimPrefix(strings.TrimPrefix(strings.TrimPrefix(strings.TrimPrefix(info.FullMethod, prefix), remarkPrefix), machinePrefix), machineRegistrationPrefix)
		if IsPublicUpdateMethod(method) {
			return handler(ctx, req)
		}
		policy, protected := registrationPolicy(method)
		if !protected {
			return handler(ctx, req)
		}
		ctx, _, err := authorizeReport(ctx, db, auth.ExtractTokenFromContext(ctx), policy)
		if err != nil {
			return nil, err
		}
		return handler(ctx, req)
	}
}
