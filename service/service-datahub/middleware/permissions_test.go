package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestRegistrationRequiresLoginOverHTTPAndGRPC(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cases := []struct{ path, method string }{
		{"/api/v2/report/plan/PlanRegistrationA", "SavePlanRegistration"},
		{"/api/v1/report/plan/save", "SavePlanRegistration"},
		{"/api/v2/report/plan/PlanMasterD", "DeletePlanMaster"},
		{"/api/v1/report/plan/delete-master", "DeletePlanMaster"},
		{"/api/v2/report/plan/PlanDetailU", "UpdatePlanDetail"},
		{"/api/v2/report/stat/ProdStatsDetailD", "DeleteProdStatsDetail"},
		{"/api/v2/report/plan/PlanMasterQ", "QueryPlanMaster"},
	}
	for _, tc := range cases {
		t.Run(tc.method+tc.path, func(t *testing.T) {
			router := gin.New()
			router.Use(ReportPermissionMiddleware(nil))
			router.POST(tc.path, func(c *gin.Context) { t.Error("unauthorized handler executed") })
			for _, token := range []string{"", "Bearer invalid"} {
				req := httptest.NewRequest(http.MethodPost, tc.path, nil)
				req.Header.Set("Authorization", token)
				rec := httptest.NewRecorder()
				router.ServeHTTP(rec, req)
				if rec.Code != http.StatusUnauthorized {
					t.Fatalf("HTTP status %d", rec.Code)
				}
			}
			_, err := ReportPermissionInterceptor(nil)(context.Background(), nil, &grpc.UnaryServerInfo{FullMethod: "/datahub.DataHubService/" + tc.method}, func(context.Context, interface{}) (interface{}, error) {
				t.Error("unauthorized RPC executed")
				return nil, nil
			})
			if status.Code(err) != codes.Unauthenticated {
				t.Fatalf("gRPC error %v", err)
			}
		})
	}
}

func TestDetailPermissionPoliciesDoNotCrossReportTypes(t *testing.T) {
	plan, _ := registrationPolicy("QueryPlanDetail")
	stat, _ := registrationPolicy("QueryProdStatsDetail")
	for _, key := range plan.keys {
		if key == "report_stat_query" {
			t.Fatal("stat grant permits plan query")
		}
	}
	for _, key := range stat.keys {
		if key == "report_plan_query" {
			t.Fatal("plan grant permits stat query")
		}
	}
}

func TestRemarkTypeRequiresOwnMenuAndLogin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for operation, permission := range map[string]string{"A": "Create", "U": "Edit", "D": "Delete", "Q": "Search"} {
		name := "ProdStatsRemarkType" + operation
		path := "/api/v2/report/prod-stats-remark-type/" + name
		policy, ok := httpRegistrationPolicy(path)
		if !ok || policy.operation != permission || len(policy.keys) != 1 || policy.keys[0] != "report_prod_stats_remark_type" {
			t.Fatalf("incorrect permission policy for %s: %+v", name, policy)
		}
		methods := []string{http.MethodPost}
		if operation == "Q" {
			methods = append(methods, http.MethodGet)
		}
		for _, method := range methods {
			r := gin.New()
			r.Use(ReportPermissionMiddleware(nil))
			r.Handle(method, path, func(c *gin.Context) { t.Fatal("unauthorized handler executed") })
			for _, token := range []string{"", "Bearer invalid"} {
				req := httptest.NewRequest(method, path, nil)
				req.Header.Set("Authorization", token)
				rec := httptest.NewRecorder()
				r.ServeHTTP(rec, req)
				if rec.Code != 401 {
					t.Fatalf("expected 401, got %d", rec.Code)
				}
			}
		}
		_, err := ReportPermissionInterceptor(nil)(context.Background(), nil, &grpc.UnaryServerInfo{FullMethod: "/datahub.ProdStatsRemarkTypeService/" + name}, func(context.Context, interface{}) (interface{}, error) {
			t.Fatal("unauthorized RPC executed")
			return nil, nil
		})
		if status.Code(err) != codes.Unauthenticated {
			t.Fatalf("expected unauthenticated, got %v", err)
		}
	}
}
