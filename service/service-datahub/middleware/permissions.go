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

func registrationPolicy(method string) (reportPolicy, bool) {
	registration := []string{"report_registration"}
	plan := []string{"report_registration", "report_plan_query"}
	stat := []string{"report_registration", "report_stat_query"}
	policies := map[string]reportPolicy{
		"QueryPlanMaster":       {registration, "Search"},
		"SavePlanRegistration":  {registration, "Create"},
		"DeletePlanMaster":      {registration, "Delete"},
		"QueryPlanDetail":       {plan, "Search"},
		"QueryProdStatsDetail":  {stat, "Search"},
		"AddPlanDetail":         {registration, "Create"},
		"UpdatePlanDetail":      {registration, "Edit"},
		"DeletePlanDetail":      {registration, "Delete"},
		"AddProdStatsDetail":    {registration, "Create"},
		"UpdateProdStatsDetail": {registration, "Edit"},
		"DeleteProdStatsDetail": {registration, "Delete"},
	}
	policy, ok := policies[method]
	return policy, ok
}

func httpRegistrationPolicy(path string) (reportPolicy, bool) {
	aliases := map[string]string{
		"PlanMasterQ": "QueryPlanMaster", "query-master": "QueryPlanMaster",
		"PlanMasterD": "DeletePlanMaster", "delete-master": "DeletePlanMaster", ":reg_code": "DeletePlanMaster",
		"PlanRegistrationA": "SavePlanRegistration", "save": "SavePlanRegistration",
		"PlanDetailQ": "QueryPlanDetail", "query-detail": "QueryPlanDetail",
		"ProdStatsDetailQ": "QueryProdStatsDetail", "query-stats-detail": "QueryProdStatsDetail",
		"PlanDetailA": "AddPlanDetail", "PlanDetailU": "UpdatePlanDetail", "PlanDetailD": "DeletePlanDetail",
		"ProdStatsDetailA": "AddProdStatsDetail", "ProdStatsDetailU": "UpdateProdStatsDetail", "ProdStatsDetailD": "DeleteProdStatsDetail",
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
		if !strings.HasPrefix(info.FullMethod, prefix) {
			return handler(ctx, req)
		}
		policy, protected := registrationPolicy(strings.TrimPrefix(info.FullMethod, prefix))
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
