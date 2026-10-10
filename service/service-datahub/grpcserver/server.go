package grpcserver

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"service-datahub/handlers"
	"service-datahub/models"
	reportmodels "service-datahub/models/report"
	pb "service-datahub/pb/datahub"
	"service-datahub/services"
	"service-datahub/services/help"
	"service-datahub/services/report/plan_detail"
	"service-datahub/services/report/plan_master"
	"service-datahub/services/report/plan_report"
	"service-datahub/services/report/prod_stats_detail"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Server struct {
	pb.UnimplementedDataHubServiceServer
	db                     *gorm.DB
	loginService           *services.LoginService
	configService          *services.ConfigService
	workProcessService     *services.WorkProcessService
	factoryService         *services.FactoryService
	planMasterService      *plan_master.PlanMasterService
	planDetailService      *plan_detail.PlanDetailService
	prodStatsDetailService *prod_stats_detail.ProdStatsDetailService
	planReportService      *plan_report.PlanReportService
	helpService            *help.CodeHelpService
	logger                 *zap.Logger
	startTime              time.Time
}

func NewServer(
	db *gorm.DB,
	loginService *services.LoginService,
	configService *services.ConfigService,
	workProcessService *services.WorkProcessService,
	factoryService *services.FactoryService,
	planMasterService *plan_master.PlanMasterService,
	planDetailService *plan_detail.PlanDetailService,
	prodStatsDetailService *prod_stats_detail.ProdStatsDetailService,
	planReportService *plan_report.PlanReportService,
	helpService *help.CodeHelpService,
	logger *zap.Logger,
) *Server {
	return &Server{
		db:                     db,
		loginService:           loginService,
		configService:          configService,
		workProcessService:     workProcessService,
		factoryService:         factoryService,
		planMasterService:      planMasterService,
		planDetailService:      planDetailService,
		prodStatsDetailService: prodStatsDetailService,
		planReportService:      planReportService,
		helpService:            helpService,
		logger:                 logger,
		startTime:              time.Now(),
	}
}

// 1. Auth Login (Protobuf RPC)
func (s *Server) Login(ctx context.Context, req *pb.LoginProtoRequest) (*pb.LoginProtoResponse, error) {
	if req.Username == "" || req.Password == "" {
		return &pb.LoginProtoResponse{
			Success:      false,
			ErrorMessage: "Username and password are required",
		}, nil
	}

	clientIP := "grpc-client"
	if p, ok := peer.FromContext(ctx); ok {
		clientIP = p.Addr.String()
	}

	resp, err := s.loginService.Login(ctx, clientIP, "DataHub-gRPC-Client", &models.LoginRequest{
		Username:  req.Username,
		Password:  req.Password,
		ConfigKey: req.ConfigKey,
	})

	if err != nil {
		return &pb.LoginProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var sessionProto *pb.TokenSessionProto
	if resp.TokenSession != nil {
		sessionProto = &pb.TokenSessionProto{
			Id:           uint32(resp.TokenSession.Id),
			ConfigKey:    resp.TokenSession.ConfigKey,
			Username:     resp.TokenSession.Username,
			AccessToken:  resp.TokenSession.AccessToken,
			TokenType:    resp.TokenSession.TokenType,
			RefreshToken: resp.TokenSession.RefreshToken,
			ExpiresIn:    resp.TokenSession.ExpiresIn,
			ExpiresAt:    resp.TokenSession.ExpiresAt.Format(time.RFC3339),
			Scope:        resp.TokenSession.Scope,
			CreatedAt:    resp.TokenSession.CreatedAt.Format(time.RFC3339),
			UpdatedAt:    resp.TokenSession.UpdatedAt.Format(time.RFC3339),
		}
	}

	return &pb.LoginProtoResponse{
		Success:     true,
		ConfigKey:   resp.ConfigKey,
		Username:    resp.Username,
		AccessToken: resp.AccessToken,
		TokenType:   resp.TokenType,
		ExpiresIn:   resp.ExpiresIn,
		ExpiresAt:   resp.ExpiresAt,
		Scope:       resp.Scope,
		Session:     sessionProto,
	}, nil
}

// 2. GetSession (Protobuf RPC)
func (s *Server) GetSession(ctx context.Context, req *pb.SessionProtoRequest) (*pb.SessionProtoResponse, error) {
	if req.Username == "" {
		return &pb.SessionProtoResponse{
			Success:      false,
			ErrorMessage: "Username is required",
		}, nil
	}

	configKey := req.ConfigKey
	if configKey == "" {
		configKey = "BravoDefault"
	}

	session, err := s.loginService.GetTokenSession(ctx, configKey, req.Username)
	if err != nil {
		return &pb.SessionProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	return &pb.SessionProtoResponse{
		Success: true,
		Session: &pb.TokenSessionProto{
			Id:           uint32(session.Id),
			ConfigKey:    session.ConfigKey,
			Username:     session.Username,
			AccessToken:  session.AccessToken,
			TokenType:    session.TokenType,
			RefreshToken: session.RefreshToken,
			ExpiresIn:    session.ExpiresIn,
			ExpiresAt:    session.ExpiresAt.Format(time.RFC3339),
			Scope:        session.Scope,
			CreatedAt:    session.CreatedAt.Format(time.RFC3339),
			UpdatedAt:    session.UpdatedAt.Format(time.RFC3339),
		},
	}, nil
}

// 3. GetAllConfigs
func (s *Server) GetAllConfigs(ctx context.Context, req *pb.GetConfigsProtoRequest) (*pb.GetConfigsProtoResponse, error) {
	configs, err := s.configService.GetAllConfigs(ctx)
	if err != nil {
		return &pb.GetConfigsProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var protoList []*pb.ErpConfigProto
	for _, c := range configs {
		protoList = append(protoList, &pb.ErpConfigProto{
			ConfigKey:          c.ConfigKey,
			ConfigName:         c.ConfigName,
			Provider:           c.Provider,
			AuthUrl:            c.AuthUrl,
			BaseApiUrl:         c.BaseApiUrl,
			Referer:            c.Referer,
			ClientId:           c.ClientId,
			ClientSecret:       c.ClientSecret,
			DeviceCode:         c.DeviceCode,
			ConnectionName:     c.ConnectionName,
			GrantType:          c.GrantType,
			Scope:              c.Scope,
			InsecureSkipVerify: c.InsecureSkipVerify,
			ExtraParams:        c.ExtraParams,
			IsActive:           c.IsActive,
			CreatedAt:          c.CreatedAt.Format(time.RFC3339),
			UpdatedAt:          c.UpdatedAt.Format(time.RFC3339),
		})
	}

	return &pb.GetConfigsProtoResponse{
		Success: true,
		Configs: protoList,
	}, nil
}

// 4. SaveConfig
func (s *Server) SaveConfig(ctx context.Context, req *pb.SaveConfigProtoRequest) (*pb.SaveConfigProtoResponse, error) {
	if req.Config == nil || req.Config.ConfigKey == "" {
		return &pb.SaveConfigProtoResponse{
			Success:      false,
			ErrorMessage: "Invalid config payload: config_key is required",
		}, nil
	}

	c := req.Config
	model := models.ErpConfig{
		ConfigKey:          c.ConfigKey,
		ConfigName:         c.ConfigName,
		Provider:           c.Provider,
		AuthUrl:            c.AuthUrl,
		BaseApiUrl:         c.BaseApiUrl,
		Referer:            c.Referer,
		ClientId:           c.ClientId,
		ClientSecret:       c.ClientSecret,
		DeviceCode:         c.DeviceCode,
		ConnectionName:     c.ConnectionName,
		GrantType:          c.GrantType,
		Scope:              c.Scope,
		InsecureSkipVerify: c.InsecureSkipVerify,
		ExtraParams:        c.ExtraParams,
		IsActive:           c.IsActive,
	}

	if err := s.configService.SaveConfig(ctx, &model); err != nil {
		return &pb.SaveConfigProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	return &pb.SaveConfigProtoResponse{
		Success: true,
		Message: "Config saved successfully",
		Config:  req.Config,
	}, nil
}

// 5. DeleteConfig
func (s *Server) DeleteConfig(ctx context.Context, req *pb.DeleteConfigProtoRequest) (*pb.DeleteConfigProtoResponse, error) {
	if req.ConfigKey == "" {
		return &pb.DeleteConfigProtoResponse{
			Success:      false,
			ErrorMessage: "Config key is required",
		}, nil
	}

	if err := s.configService.DeleteConfig(ctx, req.ConfigKey); err != nil {
		return &pb.DeleteConfigProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	return &pb.DeleteConfigProtoResponse{
		Success: true,
		Message: "Config deleted successfully",
	}, nil
}

// 6. ProxyForward (Unary high-speed binary proxy)
func (s *Server) ProxyForward(ctx context.Context, req *pb.ProxyProtoRequest) (*pb.ProxyProtoResponse, error) {
	clientIP := "grpc-client"
	if p, ok := peer.FromContext(ctx); ok {
		clientIP = p.Addr.String()
	}

	var body interface{}
	if req.BodyJson != "" {
		_ = json.Unmarshal([]byte(req.BodyJson), &body)
	} else if len(req.BodyRaw) > 0 {
		_ = json.Unmarshal(req.BodyRaw, &body)
	}

	apiResp, err := s.loginService.ForwardToErp(ctx, clientIP, "DataHub-gRPC-Client", &models.ProxyForwardRequest{
		ConfigKey: req.ConfigKey,
		Username:  req.Username,
		Method:    req.Method,
		Path:      req.Path,
		Headers:   req.Headers,
		Params:    req.Params,
		Body:      body,
	})

	if err != nil {
		return &pb.ProxyProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var traceID string
	var latencyMs int64
	var statusCode int32 = 200

	if meta, ok := apiResp.Meta.(map[string]interface{}); ok {
		if tid, ok := meta["trace_id"].(string); ok {
			traceID = tid
		}
		if lat, ok := meta["latency_ms"].(int64); ok {
			latencyMs = lat
		}
		if sc, ok := meta["status_code"].(int); ok {
			statusCode = int32(sc)
		}
	}

	dataBytes, _ := json.Marshal(apiResp.Data)

	return &pb.ProxyProtoResponse{
		Success:    apiResp.Success,
		StatusCode: statusCode,
		LatencyMs:  latencyMs,
		TraceId:    traceID,
		DataJson:   string(dataBytes),
		DataRaw:    dataBytes,
	}, nil
}

// 7. StreamProxy (Bi-directional stream for ultra-fast parallel proxy calls)
func (s *Server) StreamProxy(stream pb.DataHubService_StreamProxyServer) error {
	for {
		req, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return status.Errorf(codes.Unknown, "stream read error: %v", err)
		}

		resp, err := s.ProxyForward(stream.Context(), req)
		if err != nil {
			resp = &pb.ProxyProtoResponse{
				Success:      false,
				ErrorMessage: err.Error(),
			}
		}

		if err := stream.Send(resp); err != nil {
			return status.Errorf(codes.Unknown, "stream send error: %v", err)
		}
	}
}

// 8. GetAuditLogs
func (s *Server) GetAuditLogs(ctx context.Context, req *pb.AuditLogsProtoRequest) (*pb.AuditLogsProtoResponse, error) {
	limit := int(req.Limit)
	if limit <= 0 {
		limit = 50
	}
	offset := int(req.Offset)

	logs, total, err := s.loginService.GetAuditLogs(ctx, req.ConfigKey, limit, offset)
	if err != nil {
		return &pb.AuditLogsProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var protoLogs []*pb.AuditLogProto
	for _, l := range logs {
		protoLogs = append(protoLogs, &pb.AuditLogProto{
			Id:             uint32(l.Id),
			TraceId:        l.TraceId,
			ConfigKey:      l.ConfigKey,
			Username:       l.Username,
			Method:         l.Method,
			Endpoint:       l.Endpoint,
			TargetUrl:      l.TargetUrl,
			StatusCode:     int32(l.StatusCode),
			LatencyMs:      l.LatencyMs,
			ClientIp:       l.ClientIp,
			UserAgent:      l.UserAgent,
			RequestPayload: l.RequestPayload,
			ResponseBrief:  l.ResponseBrief,
			ErrorMessage:   l.ErrorMessage,
			CreatedAt:      l.CreatedAt.Format(time.RFC3339),
		})
	}

	return &pb.AuditLogsProtoResponse{
		Success: true,
		Logs:    protoLogs,
		Total:   total,
	}, nil
}

// 9. HealthCheck
func (s *Server) HealthCheck(ctx context.Context, req *pb.HealthProtoRequest) (*pb.HealthProtoResponse, error) {
	dbConn, err := s.db.DB()
	dbConnected := false
	if err == nil && dbConn.Ping() == nil {
		dbConnected = true
	}

	return &pb.HealthProtoResponse{
		Status:        "healthy",
		Version:       "2.0.0-protobuf",
		UptimeSeconds: int64(time.Since(s.startTime).Seconds()),
		DbConnected:   dbConnected,
	}, nil
}

// 10. QueryWorkProcess (gRPC Protobuf RPC)
func (s *Server) QueryWorkProcess(ctx context.Context, req *pb.WorkProcessProtoRequest) (*pb.WorkProcessProtoResponse, error) {
	clientIP := "grpc-client"
	if p, ok := peer.FromContext(ctx); ok {
		clientIP = p.Addr.String()
	}

	var colFilters map[string]interface{}
	if req.ColumnFiltersJson != "" {
		_ = json.Unmarshal([]byte(req.ColumnFiltersJson), &colFilters)
	}

	var rawSSE map[string]interface{}
	if req.RawSseJson != "" {
		_ = json.Unmarshal([]byte(req.RawSseJson), &rawSSE)
	}

	wpReq := &models.WorkProcessRequest{
		DocNo:           req.DocNo,
		StageOrderNo:    req.StageOrderNo,
		WorkProcessCode: req.WorkProcessCode,
		ProductTypeName: req.ProductTypeName,
		ItemCode:        req.ItemCode,
		ItemCodes:       req.ItemCodes,
		ItemName:        req.ItemName,
		ItemNames:       req.ItemNames,
		Unit:            req.Unit,
		CustomerName:    req.CustomerName,
		FactoryName:     req.FactoryName,
		Description:     req.Description,
		BranchCode:      req.BranchCode,
		FiscalYear:      req.FiscalYear,
		Page:            int(req.Page),
		PageSize:        int(req.PageSize),
		IncludeRaw:      req.IncludeRaw,
		ConfigKey:       req.ConfigKey,
		MenuKey:         req.MenuKey,
		ApiKey:          req.ApiKey,
		Username:        req.Username,
		ColumnFilters:   colFilters,
		RawSSE:          rawSSE,
	}

	startTime := time.Now()
	res, err := s.workProcessService.GetWorkProcess(ctx, clientIP, "DataHub-gRPC-Client", wpReq)
	latency := time.Since(startTime).Milliseconds()

	if err != nil {
		return &pb.WorkProcessProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
			LatencyMs:    latency,
		}, nil
	}

	dataBytes, _ := json.Marshal(res)
	var totalRecords int64
	if res != nil {
		totalRecords = int64(res.TotalCount)
	}

	return &pb.WorkProcessProtoResponse{
		Success:      true,
		Message:      "Query WorkProcess completed successfully",
		DataJson:     string(dataBytes),
		TotalRecords: totalRecords,
		LatencyMs:    latency,
	}, nil
}

// 11. GetFactories (gRPC Protobuf RPC)
func (s *Server) GetFactories(ctx context.Context, req *pb.FactoryProtoRequest) (*pb.FactoryProtoResponse, error) {
	clientIP := "grpc-client"
	if p, ok := peer.FromContext(ctx); ok {
		clientIP = p.Addr.String()
	}

	factReq := &models.FactoryRequest{
		ConfigKey:  req.ConfigKey,
		MenuKey:    req.MenuKey,
		ApiKey:     req.ApiKey,
		Username:   req.Username,
		BranchCode: req.BranchCode,
		FiscalYear: req.FiscalYear,
		Endpoint:   req.Endpoint,
	}

	factories, err := s.factoryService.GetFactories(ctx, clientIP, "DataHub-gRPC-Client", factReq)
	if err != nil {
		return &pb.FactoryProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var protoList []*pb.FactoryItemProto
	for _, f := range factories {
		var idVal int64
		var pIdVal int64
		var fnVal string

		if id, ok := f["Id"].(float64); ok {
			idVal = int64(id)
		} else if id, ok := f["Id"].(int64); ok {
			idVal = id
		}
		if pid, ok := f["ParentId"].(float64); ok {
			pIdVal = int64(pid)
		} else if pid, ok := f["ParentId"].(int64); ok {
			pIdVal = pid
		}
		if fn, ok := f["FactoryName"].(string); ok {
			fnVal = fn
		}

		protoList = append(protoList, &pb.FactoryItemProto{
			Id:          idVal,
			ParentId:    pIdVal,
			FactoryName: fnVal,
		})
	}

	dataBytes, _ := json.Marshal(factories)

	return &pb.FactoryProtoResponse{
		Success:   true,
		Message:   "Query factories completed successfully",
		Factories: protoList,
		DataJson:  string(dataBytes),
	}, nil
}

// 12. GetAllEndpoints (gRPC Protobuf RPC)
func (s *Server) GetAllEndpoints(ctx context.Context, req *pb.GetEndpointsProtoRequest) (*pb.GetEndpointsProtoResponse, error) {
	endpoints, err := s.configService.GetAllEndpoints(ctx, req.MenuKey)
	if err != nil {
		return &pb.GetEndpointsProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var protoList []*pb.ErpEndpointProto
	for _, ep := range endpoints {
		protoList = append(protoList, &pb.ErpEndpointProto{
			ApiKey:       ep.EndpointKey,
			EndpointUuid: ep.Endpoint,
			Description:  ep.Description,
			CreatedAt:    ep.CreatedAt.Format(time.RFC3339),
			UpdatedAt:    ep.UpdatedAt.Format(time.RFC3339),
		})
	}

	return &pb.GetEndpointsProtoResponse{
		Success:   true,
		Endpoints: protoList,
	}, nil
}

// 13. SaveEndpoint (gRPC Protobuf RPC)
func (s *Server) SaveEndpoint(ctx context.Context, req *pb.SaveEndpointProtoRequest) (*pb.SaveEndpointProtoResponse, error) {
	if req.Endpoint == nil || req.Endpoint.ApiKey == "" || req.Endpoint.EndpointUuid == "" {
		return &pb.SaveEndpointProtoResponse{
			Success:      false,
			ErrorMessage: "Invalid payload: api_key and endpoint_uuid are required",
		}, nil
	}

	ep := &models.ErpEndpoint{
		EndpointKey: req.Endpoint.ApiKey,
		Endpoint:    req.Endpoint.EndpointUuid,
		Description: req.Endpoint.Description,
		IsActive:    true,
	}

	if err := s.configService.SaveEndpoint(ctx, ep); err != nil {
		return &pb.SaveEndpointProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	return &pb.SaveEndpointProtoResponse{
		Success:  true,
		Message:  "Endpoint saved successfully",
		Endpoint: req.Endpoint,
	}, nil
}

// =========================================================================
// 14. QueryPlanMaster (KHSX / TKSX Master Records)
// =========================================================================
func (s *Server) QueryPlanMaster(ctx context.Context, req *pb.PlanMasterProtoRequest) (*pb.PlanMasterProtoResponse, error) {
	filters := make(map[string]string)
	if req.FiltersJson != "" {
		var rawMap map[string]interface{}
		if err := json.Unmarshal([]byte(req.FiltersJson), &rawMap); err == nil {
			for k, v := range rawMap {
				if v != nil && fmt.Sprintf("%v", v) != "" {
					filters[k] = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	if req.RegCode != "" {
		filters["RegCode"] = req.RegCode
	}
	if req.ReportType != "" {
		filters["ReportType"] = req.ReportType
	}
	if req.FactoryName != "" {
		filters["FactoryName"] = req.FactoryName
	}
	if req.ApplyDate != "" {
		filters["ApplyDate"] = req.ApplyDate
	}
	if req.ApplyDateFrom != "" {
		filters["ApplyDateFrom"] = req.ApplyDateFrom
	}
	if req.ApplyDateTo != "" {
		filters["ApplyDateTo"] = req.ApplyDateTo
	}
	if req.Status != "" {
		filters["Status"] = req.Status
	}
	if req.IsActive != "" {
		filters["IsActive"] = req.IsActive
	}
	if req.Page > 0 {
		filters["page"] = strconv.Itoa(int(req.Page))
	}
	if req.PageSize > 0 {
		filters["pageSize"] = strconv.Itoa(int(req.PageSize))
	}
	if req.SortField != "" {
		filters["sortField"] = req.SortField
	}
	if req.SortOrder != "" {
		filters["sortOrder"] = req.SortOrder
	}

	masters, pageInfo, err := s.planMasterService.PlanMasterQ(ctx, filters)
	if err != nil {
		return &pb.PlanMasterProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var protoList []*pb.PlanMasterProtoItem
	for i := range masters {
		protoList = append(protoList, mapPlanMasterToProto(&masters[i]))
	}

	var totalRecords, totalAll int64
	var totalPages, page, pageSize int32
	if pageInfo != nil {
		totalRecords = pageInfo.Total
		totalAll = pageInfo.TotalAll
		totalPages = int32(pageInfo.TotalPages)
		page = int32(pageInfo.Page)
		pageSize = int32(pageInfo.PageSize)
	}

	dataBytes, _ := json.Marshal(masters)

	return &pb.PlanMasterProtoResponse{
		Success:      true,
		Message:      "Query Plan Master success",
		Data:         protoList,
		DataJson:     string(dataBytes),
		TotalRecords: totalRecords,
		TotalAll:     totalAll,
		TotalPages:   totalPages,
		Page:         page,
		PageSize:     pageSize,
	}, nil
}

// =========================================================================
// 15. QueryPlanDetail (24-Column KHSX Plan Detail)
// =========================================================================
func (s *Server) QueryPlanDetail(ctx context.Context, req *pb.PlanDetailProtoRequest) (*pb.PlanDetailProtoResponse, error) {
	filters := make(map[string]string)
	if req.FiltersJson != "" {
		var rawMap map[string]interface{}
		if err := json.Unmarshal([]byte(req.FiltersJson), &rawMap); err == nil {
			for k, v := range rawMap {
				if v != nil && fmt.Sprintf("%v", v) != "" {
					filters[k] = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	if req.MasterSeq != "" {
		filters["MasterSeq"] = req.MasterSeq
	}
	if req.RegCode != "" {
		filters["RegCode"] = req.RegCode
	}
	if req.ItemCode != "" {
		filters["ItemCode"] = req.ItemCode
	}
	if req.OperationNo != "" {
		filters["OperationNo"] = req.OperationNo
	}
	if req.RoutingDocNo != "" {
		filters["RoutingDocNo"] = req.RoutingDocNo
	}
	if req.OpDate != "" {
		filters["OpDate"] = req.OpDate
	}
	if req.MachineName != "" {
		filters["MachineName"] = req.MachineName
	}
	if req.Page > 0 {
		filters["page"] = strconv.Itoa(int(req.Page))
	}
	if req.PageSize > 0 {
		filters["pageSize"] = strconv.Itoa(int(req.PageSize))
	}
	if req.SortField != "" {
		filters["sortField"] = req.SortField
	}
	if req.SortOrder != "" {
		filters["sortOrder"] = req.SortOrder
	}

	details, pageInfo, err := s.planDetailService.PlanDetailQ(ctx, filters)
	if err != nil {
		return &pb.PlanDetailProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var protoList []*pb.PlanDetailProtoItem
	for i := range details {
		protoList = append(protoList, mapPlanDetailToProto(&details[i]))
	}

	var totalRecords, totalAll int64
	var totalPages, page, pageSize int32
	if pageInfo != nil {
		totalRecords = pageInfo.Total
		totalAll = pageInfo.TotalAll
		totalPages = int32(pageInfo.TotalPages)
		page = int32(pageInfo.Page)
		pageSize = int32(pageInfo.PageSize)
	}

	dataBytes, _ := json.Marshal(details)

	return &pb.PlanDetailProtoResponse{
		Success:      true,
		Message:      "Query Plan Detail success",
		Data:         protoList,
		DataJson:     string(dataBytes),
		TotalRecords: totalRecords,
		TotalAll:     totalAll,
		TotalPages:   totalPages,
		Page:         page,
		PageSize:     pageSize,
	}, nil
}

// =========================================================================
// 16. QueryProdStatsDetail (TKSX Production Stats Detail)
// =========================================================================
func (s *Server) QueryProdStatsDetail(ctx context.Context, req *pb.ProdStatsDetailProtoRequest) (*pb.ProdStatsDetailProtoResponse, error) {
	filters := make(map[string]string)
	if req.FiltersJson != "" {
		var rawMap map[string]interface{}
		if err := json.Unmarshal([]byte(req.FiltersJson), &rawMap); err == nil {
			for k, v := range rawMap {
				if v != nil && fmt.Sprintf("%v", v) != "" {
					filters[k] = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	if req.MasterSeq != "" {
		filters["MasterSeq"] = req.MasterSeq
	}
	if req.RegCode != "" {
		filters["RegCode"] = req.RegCode
	}
	if req.ItemCode != "" {
		filters["ItemCode"] = req.ItemCode
	}
	if req.OperationNo != "" {
		filters["OperationNo"] = req.OperationNo
	}
	if req.StatTicketNo != "" {
		filters["StatTicketNo"] = req.StatTicketNo
	}
	if req.StatDate != "" {
		filters["StatDate"] = req.StatDate
	}
	if req.Customer != "" {
		filters["Customer"] = req.Customer
	}
	if req.OrderNo != "" {
		filters["OrderNo"] = req.OrderNo
	}
	if req.Page > 0 {
		filters["page"] = strconv.Itoa(int(req.Page))
	}
	if req.PageSize > 0 {
		filters["pageSize"] = strconv.Itoa(int(req.PageSize))
	}
	if req.SortField != "" {
		filters["sortField"] = req.SortField
	}
	if req.SortOrder != "" {
		filters["sortOrder"] = req.SortOrder
	}

	details, pageInfo, err := s.prodStatsDetailService.ProdStatsDetailQ(ctx, filters)
	if err != nil {
		return &pb.ProdStatsDetailProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var protoList []*pb.ProdStatsDetailProtoItem
	for i := range details {
		protoList = append(protoList, mapProdStatsDetailToProto(&details[i]))
	}

	var totalRecords, totalAll int64
	var totalPages, page, pageSize int32
	if pageInfo != nil {
		totalRecords = pageInfo.Total
		totalAll = pageInfo.TotalAll
		totalPages = int32(pageInfo.TotalPages)
		page = int32(pageInfo.Page)
		pageSize = int32(pageInfo.PageSize)
	}

	dataBytes, _ := json.Marshal(details)

	return &pb.ProdStatsDetailProtoResponse{
		Success:      true,
		Message:      "Query ProdStats Detail success",
		Data:         protoList,
		DataJson:     string(dataBytes),
		TotalRecords: totalRecords,
		TotalAll:     totalAll,
		TotalPages:   totalPages,
		Page:         page,
		PageSize:     pageSize,
	}, nil
}

// =========================================================================
// 17. SavePlanRegistration (Master + Detail Batch Registration)
// =========================================================================
func (s *Server) SavePlanRegistration(ctx context.Context, req *pb.PlanRegistrationSaveProtoRequest) (*pb.PlanRegistrationSaveProtoResponse, error) {
	reportType := strings.ToLower(strings.TrimSpace(req.ReportType))
	if reportType == "" {
		reportType = "plan"
	}
	factoryName := strings.TrimSpace(req.FactoryName)
	factoryCode := "GS1"
	if strings.EqualFold(strings.TrimSpace(req.FactoryCode), "GS5") || strings.Contains(strings.ToUpper(factoryName), "GS5") || strings.Contains(strings.ToLower(factoryName), "quáº¿ vÃµ") {
		factoryCode = "GS5"
		if factoryName == "" {
			factoryName = "GS5 Quáº¿ VÃµ 1B"
		}
	} else {
		if factoryName == "" {
			factoryName = "GS1 HÃ  Ná»™i"
		}
	}

	applyDate := strings.TrimSpace(req.ApplyDate)
	if applyDate == "" {
		applyDate = time.Now().Format("2006-01-02")
	}

	statusStr := strings.TrimSpace(req.Status)
	if statusStr == "" {
		if req.IsDraft {
			statusStr = "draft"
		} else {
			statusStr = "published"
		}
	}

	remark := strings.TrimSpace(req.Remark)
	regCode := strings.TrimSpace(req.RegCode)
	if regCode == "" {
		prefix := "KHSX"
		if reportType == "statistics" || reportType == "tksx" {
			prefix = "TKSX"
		}
		datePart := strings.ReplaceAll(applyDate, "-", "")
		regCode = fmt.Sprintf("%s_%s_%04d", prefix, datePart, time.Now().UnixNano()%10000)
	}

	isStat := reportType == "statistics" || reportType == "tksx"

	// Láº¥y máº£ng dÃ²ng chi tiáº¿t tá»« body gá»‘c (planData / statsData / sheetData / data) hoáº·c data_json
	rowsJSON, rowsErr := extractRegistrationRowsJSON(req, isStat)
	if rowsErr != nil {
		return &pb.PlanRegistrationSaveProtoResponse{
			Success:      false,
			Message:      rowsErr.Error(),
			ErrorMessage: rowsErr.Error(),
		}, nil
	}

	userId := strings.TrimSpace(req.CreatedBy)
	if userId == "" {
		userId = "SystemAdmin"
	}
	userName := strings.TrimSpace(req.CreatedByName)
	if userName == "" {
		userName = userId
	}

	var insertedCount int64
	var createdMaster reportmodels.ERPPlanMaster

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Tự động tìm và dọn dẹp các đợt cũ cùng RegCode hoặc cùng (FactoryCode + ReportType + ApplyDate) để ghi đè dữ liệu mới nhất
		var existingMasters []reportmodels.ERPPlanMaster
		if reportType == "statistics" || reportType == "tksx" {
			tx.Where(`"RegCode" = ? OR ("FactoryCode" = ? AND ("ReportType" = 'statistics' OR "ReportType" = 'tksx') AND "ApplyDate" = ?)`, regCode, factoryCode, applyDate).Find(&existingMasters)
		} else {
			tx.Where(`"RegCode" = ? OR ("FactoryCode" = ? AND ("ReportType" = 'plan' OR "ReportType" = 'khsx') AND "ApplyDate" = ?)`, regCode, factoryCode, applyDate).Find(&existingMasters)
		}
		for _, em := range existingMasters {
			tx.Where(`"MasterSeq" = ? OR "RegCode" = ?`, em.IdSeq, em.RegCode).Delete(&reportmodels.ERPProdStatsDetail{})
			tx.Where(`"MasterSeq" = ? OR "RegCode" = ?`, em.IdSeq, em.RegCode).Delete(&reportmodels.ERPPlanDetail{})
			tx.Where(`"IdSeq" = ?`, em.IdSeq).Delete(&reportmodels.ERPPlanMaster{})
		}

		now := time.Now()
		masterIdSeq := services.GenerateUUIDv7()

		createdMaster = reportmodels.ERPPlanMaster{
			IdSeq:         masterIdSeq,
			RegCode:       regCode,
			ReportType:    reportType,
			FactoryCode:   &factoryCode,
			FactoryName:   &factoryName,
			ApplyDate:     &applyDate,
			Remark:        &remark,
			Status:        &statusStr,
			RowVersion:    1,
			IsActive:      true,
			CreatedBy:     &userId,
			CreatedByName: &userName,
			CreatedAt:     &now,
			UpdatedBy:     &userId,
			UpdatedByName: &userName,
			UpdatedAt:     &now,
		}

		if len(rowsJSON) > 0 {
			if isStat {
				var statsList []reportmodels.ERPProdStatsDetail
				if err := json.Unmarshal(rowsJSON, &statsList); err != nil {
					return fmt.Errorf("dá»¯ liá»‡u chi tiáº¿t TKSX khÃ´ng há»£p lá»‡: %w", err)
				}
				if len(statsList) > 0 {
					for i := range statsList {
						if statsList[i].IdSeq == "" {
							statsList[i].IdSeq = services.GenerateUUIDv7()
						}
						statsList[i].MasterSeq = masterIdSeq
						statsList[i].RegCode = regCode
						statsList[i].RowSeq = i + 1
						statsList[i].WorkingTag = "A"
						statsList[i].RowVersion = 1
						statsList[i].CreatedBy = &userId
						statsList[i].CreatedByName = &userName
						statsList[i].CreatedAt = &now
						statsList[i].UpdatedBy = &userId
						statsList[i].UpdatedAt = &now
						statsList[i].IsActive = true
						prod_stats_detail.NormalizeStatsItem(&statsList[i])
					}
					if err := tx.CreateInBatches(statsList, 500).Error; err != nil {
						return fmt.Errorf("lá»—i khi lÆ°u dÃ²ng chi tiáº¿t TKSX: %w", err)
					}
					insertedCount = int64(len(statsList))
					createdMaster.TotalRows = len(statsList)
				}
			} else {
				var planList []reportmodels.ERPPlanDetail
				if err := json.Unmarshal(rowsJSON, &planList); err != nil {
					return fmt.Errorf("dá»¯ liá»‡u chi tiáº¿t KHSX khÃ´ng há»£p lá»‡: %w", err)
				}
				if len(planList) > 0 {
					for i := range planList {
						if planList[i].IdSeq == "" {
							planList[i].IdSeq = services.GenerateUUIDv7()
						}
						planList[i].MasterSeq = masterIdSeq
						planList[i].RegCode = regCode
						planList[i].RowSeq = i + 1
						planList[i].WorkingTag = "A"
						planList[i].RowVersion = 1
						planList[i].CreatedBy = &userId
						planList[i].CreatedByName = &userName
						planList[i].CreatedAt = &now
						planList[i].UpdatedBy = &userId
						planList[i].UpdatedAt = &now
						planList[i].IsActive = true
					}
					if err := tx.CreateInBatches(planList, 500).Error; err != nil {
						return fmt.Errorf("lá»—i khi lÆ°u dÃ²ng chi tiáº¿t KHSX: %w", err)
					}
					insertedCount = int64(len(planList))
					createdMaster.TotalRows = len(planList)
				}
			}
		}

		// Khi frontend chia chunk (>1000 dÃ²ng), TotalRows lÃ  tá»•ng toÃ n bá»™ Ä‘á»£t chá»© khÃ´ng chá»‰ chunk Ä‘áº§u
		if int(req.TotalRows) > createdMaster.TotalRows {
			createdMaster.TotalRows = int(req.TotalRows)
		}

		if err := tx.Create(&createdMaster).Error; err != nil {
			return fmt.Errorf("lá»—i khi táº¡o báº£n ghi Master: %w", err)
		}

		return nil
	})

	if err != nil {
		return &pb.PlanRegistrationSaveProtoResponse{
			Success:      false,
			Message:      err.Error(),
			ErrorMessage: err.Error(),
		}, nil
	}

	dataBytes, _ := json.Marshal(createdMaster)

	return &pb.PlanRegistrationSaveProtoResponse{
		Success:      true,
		Message:      "LÆ°u Ä‘Äƒng kÃ½ bÃ¡o cÃ¡o thÃ nh cÃ´ng",
		Master:       mapPlanMasterToProto(&createdMaster),
		DataJson:     string(dataBytes),
		InsertedRows: insertedCount,
	}, nil
}

// =========================================================================
// 17.1. DeletePlanMaster (Cascade Master + Details Deletion)
// =========================================================================
func (s *Server) DeletePlanMaster(ctx context.Context, req *pb.DeletePlanMasterProtoRequest) (*pb.DeletePlanMasterProtoResponse, error) {
	var masterSeqs []string
	if len(req.MasterSeqs) > 0 {
		masterSeqs = append(masterSeqs, req.MasterSeqs...)
	}
	if req.RegCode != "" {
		masterSeqs = append(masterSeqs, req.RegCode)
	}
	if req.DataJson != "" {
		var seqsFromJson []string
		if err := json.Unmarshal([]byte(req.DataJson), &seqsFromJson); err == nil && len(seqsFromJson) > 0 {
			masterSeqs = append(masterSeqs, seqsFromJson...)
		} else {
			var objMap map[string]interface{}
			if err := json.Unmarshal([]byte(req.DataJson), &objMap); err == nil {
				if ms, ok := objMap["masterSeqs"].([]interface{}); ok {
					for _, item := range ms {
						if str, ok := item.(string); ok && str != "" {
							masterSeqs = append(masterSeqs, str)
						}
					}
				}
			}
		}
	}

	userId := req.UserId
	if userId == "" {
		userId = "SystemAdmin"
	}

	if len(masterSeqs) == 0 {
		return &pb.DeletePlanMasterProtoResponse{
			Success:      false,
			ErrorMessage: "Danh sÃ¡ch mÃ£ hoáº·c IdSeq Ä‘á»£t Ä‘Äƒng kÃ½ cáº§n xÃ³a rá»—ng",
		}, nil
	}

	err := s.planMasterService.PlanMasterD(ctx, masterSeqs, userId)
	if err != nil {
		return &pb.DeletePlanMasterProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	return &pb.DeletePlanMasterProtoResponse{
		Success:     true,
		Message:     "XÃ³a Ä‘á»£t Ä‘Äƒng kÃ½ bÃ¡o cÃ¡o vÃ  chi tiáº¿t thÃ nh cÃ´ng",
		DeletedRows: int64(len(masterSeqs)),
	}, nil
}

// =========================================================================
// 17.2. AddPlanDetail (KHSX Detail Rows Batch Creation)
// =========================================================================
func (s *Server) AddPlanDetail(ctx context.Context, req *pb.AddPlanDetailProtoRequest) (*pb.AddPlanDetailProtoResponse, error) {
	var items []reportmodels.ERPPlanDetail
	if req.DataJson != "" {
		if err := json.Unmarshal(normalizeDataJSON(req.DataJson, false), &items); err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "dữ liệu chi tiết không hợp lệ: %v", err)
		}
	}
	if len(items) == 0 && len(req.Items) > 0 {
		for _, protoItem := range req.Items {
			items = append(items, protoToPlanDetailModel(protoItem))
		}
	}

	userId := req.UserId
	if userId == "" {
		userId = "SystemAdmin"
	}

	saved, err := s.planDetailService.PlanDetailA(ctx, items, userId)
	if err != nil {
		return &pb.AddPlanDetailProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var protoList []*pb.PlanDetailProtoItem
	for i := range saved {
		protoList = append(protoList, mapPlanDetailToProto(&saved[i]))
	}

	dataBytes, _ := json.Marshal(saved)

	return &pb.AddPlanDetailProtoResponse{
		Success:  true,
		Message:  "ThÃªm má»›i chi tiáº¿t KHSX thÃ nh cÃ´ng",
		Data:     protoList,
		DataJson: string(dataBytes),
	}, nil
}

// =========================================================================
// 17.3. UpdatePlanDetail (KHSX Detail Rows Update)
// =========================================================================
func (s *Server) UpdatePlanDetail(ctx context.Context, req *pb.UpdatePlanDetailProtoRequest) (*pb.UpdatePlanDetailProtoResponse, error) {
	var items []reportmodels.ERPPlanDetail
	if req.DataJson != "" {
		if err := json.Unmarshal(normalizeDataJSON(req.DataJson, false), &items); err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "dữ liệu chi tiết không hợp lệ: %v", err)
		}
	}
	if len(items) == 0 && len(req.Items) > 0 {
		for _, protoItem := range req.Items {
			items = append(items, protoToPlanDetailModel(protoItem))
		}
	}

	userId := req.UserId
	if userId == "" {
		userId = "SystemAdmin"
	}

	updated, err := s.planDetailService.PlanDetailU(ctx, items, userId)
	if err != nil {
		return &pb.UpdatePlanDetailProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var protoList []*pb.PlanDetailProtoItem
	for i := range updated {
		protoList = append(protoList, mapPlanDetailToProto(&updated[i]))
	}

	dataBytes, _ := json.Marshal(updated)

	return &pb.UpdatePlanDetailProtoResponse{
		Success:  true,
		Message:  "Cáº­p nháº­t chi tiáº¿t KHSX thÃ nh cÃ´ng",
		Data:     protoList,
		DataJson: string(dataBytes),
	}, nil
}

// =========================================================================
// 17.4. DeletePlanDetail (KHSX Detail Rows Deletion)
// =========================================================================
func (s *Server) DeletePlanDetail(ctx context.Context, req *pb.DeletePlanDetailProtoRequest) (*pb.DeletePlanDetailProtoResponse, error) {
	var detailSeqs []string
	if len(req.DetailSeqs) > 0 {
		detailSeqs = append(detailSeqs, req.DetailSeqs...)
	}
	if req.DataJson != "" {
		var seqsFromJson []string
		if err := json.Unmarshal([]byte(req.DataJson), &seqsFromJson); err == nil && len(seqsFromJson) > 0 {
			detailSeqs = append(detailSeqs, seqsFromJson...)
		}
	}

	userId := req.UserId
	if userId == "" {
		userId = "SystemAdmin"
	}

	err := s.planDetailService.PlanDetailD(ctx, detailSeqs, userId)
	if err != nil {
		return &pb.DeletePlanDetailProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	return &pb.DeletePlanDetailProtoResponse{
		Success:     true,
		Message:     "XÃ³a chi tiáº¿t KHSX thÃ nh cÃ´ng",
		DeletedRows: int64(len(detailSeqs)),
	}, nil
}

// =========================================================================
// 17.5. AddProdStatsDetail (TKSX Detail Rows Batch Creation)
// =========================================================================
func (s *Server) AddProdStatsDetail(ctx context.Context, req *pb.AddProdStatsDetailProtoRequest) (*pb.AddProdStatsDetailProtoResponse, error) {
	var items []reportmodels.ERPProdStatsDetail
	if req.DataJson != "" {
		if err := json.Unmarshal(normalizeDataJSON(req.DataJson, false), &items); err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "dữ liệu chi tiết không hợp lệ: %v", err)
		}
	}
	if len(items) == 0 && len(req.Items) > 0 {
		for _, protoItem := range req.Items {
			items = append(items, protoToProdStatsDetailModel(protoItem))
		}
	}

	userId := req.UserId
	if userId == "" {
		userId = "SystemAdmin"
	}

	saved, err := s.prodStatsDetailService.ProdStatsDetailA(ctx, items, userId)
	if err != nil {
		return &pb.AddProdStatsDetailProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var protoList []*pb.ProdStatsDetailProtoItem
	for i := range saved {
		protoList = append(protoList, mapProdStatsDetailToProto(&saved[i]))
	}

	dataBytes, _ := json.Marshal(saved)

	return &pb.AddProdStatsDetailProtoResponse{
		Success:  true,
		Message:  "ThÃªm má»›i chi tiáº¿t TKSX thÃ nh cÃ´ng",
		Data:     protoList,
		DataJson: string(dataBytes),
	}, nil
}

// =========================================================================
// 17.6. UpdateProdStatsDetail (TKSX Detail Rows Update)
// =========================================================================
func (s *Server) UpdateProdStatsDetail(ctx context.Context, req *pb.UpdateProdStatsDetailProtoRequest) (*pb.UpdateProdStatsDetailProtoResponse, error) {
	var items []reportmodels.ERPProdStatsDetail
	if req.DataJson != "" {
		if err := json.Unmarshal(normalizeDataJSON(req.DataJson, false), &items); err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "dữ liệu chi tiết không hợp lệ: %v", err)
		}
	}
	if len(items) == 0 && len(req.Items) > 0 {
		for _, protoItem := range req.Items {
			items = append(items, protoToProdStatsDetailModel(protoItem))
		}
	}

	userId := req.UserId
	if userId == "" {
		userId = "SystemAdmin"
	}

	updated, err := s.prodStatsDetailService.ProdStatsDetailU(ctx, items, userId)
	if err != nil {
		return &pb.UpdateProdStatsDetailProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	var protoList []*pb.ProdStatsDetailProtoItem
	for i := range updated {
		protoList = append(protoList, mapProdStatsDetailToProto(&updated[i]))
	}

	dataBytes, _ := json.Marshal(updated)

	return &pb.UpdateProdStatsDetailProtoResponse{
		Success:  true,
		Message:  "Cáº­p nháº­t chi tiáº¿t TKSX thÃ nh cÃ´ng",
		Data:     protoList,
		DataJson: string(dataBytes),
	}, nil
}

// =========================================================================
// 17.7. DeleteProdStatsDetail (TKSX Detail Rows Deletion)
// =========================================================================
func (s *Server) DeleteProdStatsDetail(ctx context.Context, req *pb.DeleteProdStatsDetailProtoRequest) (*pb.DeleteProdStatsDetailProtoResponse, error) {
	var detailSeqs []string
	if len(req.DetailSeqs) > 0 {
		detailSeqs = append(detailSeqs, req.DetailSeqs...)
	}
	if req.DataJson != "" {
		var seqsFromJson []string
		if err := json.Unmarshal([]byte(req.DataJson), &seqsFromJson); err == nil && len(seqsFromJson) > 0 {
			detailSeqs = append(detailSeqs, seqsFromJson...)
		}
	}

	userId := req.UserId
	if userId == "" {
		userId = "SystemAdmin"
	}

	err := s.prodStatsDetailService.ProdStatsDetailD(ctx, detailSeqs, userId)
	if err != nil {
		return &pb.DeleteProdStatsDetailProtoResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	return &pb.DeleteProdStatsDetailProtoResponse{
		Success:     true,
		Message:     "XÃ³a chi tiáº¿t TKSX thÃ nh cÃ´ng",
		DeletedRows: int64(len(detailSeqs)),
	}, nil
}

// =========================================================================
// 18. GetProductionPlanReport (Aggregated Plan Report)
// =========================================================================
func (s *Server) GetProductionPlanReport(ctx context.Context, req *pb.PlanReportProtoRequest) (*pb.PlanReportProtoResponse, error) {
	filters := make(map[string]string)
	if req.FiltersJson != "" {
		var rawMap map[string]interface{}
		if err := json.Unmarshal([]byte(req.FiltersJson), &rawMap); err == nil {
			for k, v := range rawMap {
				if v != nil && fmt.Sprintf("%v", v) != "" {
					filters[k] = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	if req.FactoryCode != "" {
		filters["factoryCode"] = req.FactoryCode
	}
	if req.RegCode != "" {
		filters["regCode"] = req.RegCode
	}
	if req.MasterSeq != "" {
		filters["masterSeq"] = req.MasterSeq
	}
	if req.FromDate != "" {
		filters["fromDate"] = req.FromDate
		filters["planDateFrom"] = req.FromDate
	}
	if req.ToDate != "" {
		filters["toDate"] = req.ToDate
		filters["planDateTo"] = req.ToDate
	}
	if req.Pic != "" {
		filters["pic"] = req.Pic
	}
	if req.TeamName != "" {
		filters["teamName"] = req.TeamName
	}
	if req.MachineCode != "" {
		filters["machineCode"] = req.MachineCode
	}
	if req.ItemCode != "" {
		filters["itemCode"] = req.ItemCode
	}
	if req.OrderNo != "" {
		filters["orderNo"] = req.OrderNo
	}
	if req.Status != "" {
		filters["status"] = req.Status
	}
	if req.Page > 0 {
		filters["page"] = strconv.Itoa(int(req.Page))
	}
	if req.PageSize > 0 {
		filters["pageSize"] = strconv.Itoa(int(req.PageSize))
	}

	rep, err := s.planReportService.GenerateProductionPlanReport(ctx, filters)
	if err != nil {
		return &pb.PlanReportProtoResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	dataBytes, _ := json.Marshal(rep)

	resp := &pb.PlanReportProtoResponse{
		Success:  true,
		Message:  "Generate plan report success",
		DataJson: string(dataBytes),
	}

	if rep != nil {
		resp.Summary = &pb.PlanReportSummaryProto{
			TotalOrders:     int32(rep.Summary.TotalOrders),
			TotalTickets:    int32(rep.Summary.TotalTickets),
			TotalPlanQty:    rep.Summary.TotalPlanQty,
			TotalActualQty:  rep.Summary.TotalActualQty,
			TotalPassQty:    rep.Summary.TotalPassQty,
			OverallProgress: rep.Summary.OverallProgress,
			AvgPassRate:     rep.Summary.AvgPassRate,
			TotalItems:      int32(rep.Summary.TotalItems),
			SxSaiNgayCount:  int32(rep.Summary.SxSaiNgayCount),
			SxSaiNgayRate:   rep.Summary.SxSaiNgayRate,
			TruotKhCount:    int32(rep.Summary.TruotKhCount),
			TruotKhRate:     rep.Summary.TruotKhRate,
			KhopSlCount:     int32(rep.Summary.KhopSlCount),
			KhopSlRate:      rep.Summary.KhopSlRate,
			KhopJobCount:    int32(rep.Summary.KhopJobCount),
			KhopJobRate:     rep.Summary.KhopJobRate,
			TotalDays:       int32(rep.Summary.TotalDays),
			FromDate:        rep.Summary.FromDate,
			ToDate:          rep.Summary.ToDate,
		}

		for _, item := range rep.DpStatusBreakdown {
			resp.DpStatusBreakdown = append(resp.DpStatusBreakdown, &pb.PlanStatusItemProto{
				Name:  item.Name,
				Count: int32(item.Count),
				Rate:  item.Rate,
				Color: item.Color,
				Tag:   item.Tag,
			})
		}
		for _, item := range rep.TimeStatusBreakdown {
			resp.TimeStatusBreakdown = append(resp.TimeStatusBreakdown, &pb.PlanStatusItemProto{
				Name:  item.Name,
				Count: int32(item.Count),
				Rate:  item.Rate,
				Color: item.Color,
				Tag:   item.Tag,
			})
		}
		for _, item := range rep.CapaStatusBreakdown {
			resp.CapaStatusBreakdown = append(resp.CapaStatusBreakdown, &pb.PlanStatusItemProto{
				Name:  item.Name,
				Count: int32(item.Count),
				Rate:  item.Rate,
				Color: item.Color,
				Tag:   item.Tag,
			})
		}
		for _, item := range rep.PicBreakdown {
			resp.PicBreakdown = append(resp.PicBreakdown, &pb.PicPlanAggregateProto{
				Pic:            item.Pic,
				TotalOrders:    int32(item.TotalOrders),
				PlanQty:        item.PlanQty,
				ActualQty:      item.ActualQty,
				PassRate:       item.PassRate,
				SxSaiNgayCount: int32(item.SxSaiNgayCount),
				TruotKhCount:   int32(item.TruotKhCount),
				KhopSlCount:    int32(item.KhopSlCount),
				KhopJobCount:   int32(item.KhopJobCount),
			})
		}
		for _, item := range rep.TeamBreakdown {
			resp.TeamBreakdown = append(resp.TeamBreakdown, &pb.TeamPlanAggregateProto{
				TeamName:    item.TeamName,
				TotalOrders: int32(item.TotalOrders),
				PlanQty:     item.PlanQty,
				ActualQty:   item.ActualQty,
				PassRate:    item.PassRate,
			})
		}
		for _, item := range rep.MachineBreakdown {
			resp.MachineBreakdown = append(resp.MachineBreakdown, &pb.MachinePlanAggregateProto{
				MachineCode: item.MachineCode,
				MachineName: item.MachineName,
				TeamName:    item.TeamName,
				TotalOrders: int32(item.TotalOrders),
				PlanQty:     item.PlanQty,
				ActualQty:   item.ActualQty,
				PassRate:    item.PassRate,
			})
		}
		for _, item := range rep.DailyTrendData {
			resp.DailyTrendData = append(resp.DailyTrendData, &pb.DailyPlanAggregateProto{
				Date:       item.Date,
				PlanQty:    item.PlanQty,
				ActualQty:  item.ActualQty,
				OrderCount: int32(item.OrderCount),
				PassRate:   item.PassRate,
			})
		}

		resp.FilterOptions = &pb.PlanFilterOptionsProto{
			Factories: rep.FilterOptions.Factories,
			Pics:      rep.FilterOptions.Pics,
			Teams:     rep.FilterOptions.Teams,
			Machines:  rep.FilterOptions.Machines,
			Dates:     rep.FilterOptions.Dates,
		}

		for i := range rep.Items {
			resp.Items = append(resp.Items, mapPlanDetailToProto(&rep.Items[i].ERPPlanDetail))
		}

		resp.TotalRecords = rep.Pagination.Total
		resp.TotalPages = int32(rep.Pagination.TotalPages)
		resp.Page = int32(rep.Pagination.Page)
		resp.PageSize = int32(rep.Pagination.PageSize)
	}

	return resp, nil
}

// =========================================================================
// 19. GetProductionStatisticsReport (Aggregated Stats Report)
// =========================================================================
func (s *Server) GetProductionStatisticsReport(ctx context.Context, req *pb.ProdStatsReportProtoRequest) (*pb.ProdStatsReportProtoResponse, error) {
	filters := make(map[string]string)
	if req.FiltersJson != "" {
		var rawMap map[string]interface{}
		if err := json.Unmarshal([]byte(req.FiltersJson), &rawMap); err == nil {
			for k, v := range rawMap {
				if v != nil && fmt.Sprintf("%v", v) != "" {
					filters[k] = fmt.Sprintf("%v", v)
				}
			}
		}
	}
	if req.FactoryCode != "" {
		filters["factoryCode"] = req.FactoryCode
	}
	if req.RegCode != "" {
		filters["regCode"] = req.RegCode
	}
	if req.MasterSeq != "" {
		filters["masterSeq"] = req.MasterSeq
	}
	if req.StatDateFrom != "" {
		filters["fromDate"] = req.StatDateFrom
		filters["statDateFrom"] = req.StatDateFrom
	}
	if req.StatDateTo != "" {
		filters["toDate"] = req.StatDateTo
		filters["statDateTo"] = req.StatDateTo
	}
	if req.TeamName != "" {
		filters["teamName"] = req.TeamName
	}
	if req.MachineCode != "" {
		filters["machineCode"] = req.MachineCode
	}
	if req.Page > 0 {
		filters["page"] = strconv.Itoa(int(req.Page))
	}
	if req.PageSize > 0 {
		filters["pageSize"] = strconv.Itoa(int(req.PageSize))
	}

	rep, err := s.prodStatsDetailService.GenerateProductionStatisticsReport(ctx, filters)
	if err != nil {
		return &pb.ProdStatsReportProtoResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	dataBytes, _ := json.Marshal(rep)

	resp := &pb.ProdStatsReportProtoResponse{
		Success:  true,
		Message:  "Generate prod stats report success",
		DataJson: string(dataBytes),
	}

	if rep != nil {
		resp.Summary = &pb.ProdStatsReportSummaryProto{
			TotalTickets:       int32(rep.Summary.TotalTickets),
			TotalPlanQty:       rep.Summary.TotalPlanQty,
			TotalActualQty:     rep.Summary.TotalActualQty,
			TotalPassQty:       rep.Summary.TotalPassQty,
			TotalDefectQty:     rep.Summary.TotalDefectQty,
			AvgPassRate:        rep.Summary.AvgPassRate,
			TotalRuntimeHours:  rep.Summary.TotalRuntimeHours,
			CountCompleted:     int32(rep.Summary.CountCompleted),
			CountRunning:       int32(rep.Summary.CountRunning),
		}

		for _, item := range rep.ChartByTeam {
			resp.ChartByTeam = append(resp.ChartByTeam, &pb.TeamStatAggregateProto{
				TeamName:     item.TeamName,
				TeamCode:     item.TeamCode,
				PlanQty:      item.PlanQty,
				ActualQty:    item.ActualQty,
				PassQty:      item.PassQty,
				PassRate:     item.PassRate,
				RuntimeHours: item.RuntimeHours,
				TicketCount:  int32(item.TicketCount),
			})
		}

		for _, item := range rep.ChartByMachine {
			resp.ChartByMachine = append(resp.ChartByMachine, &pb.MachineStatAggregateProto{
				MachineCode:  item.MachineCode,
				MachineName:  item.MachineName,
				TeamName:     item.TeamName,
				ActualQty:    item.ActualQty,
				PassRate:     item.PassRate,
				RuntimeHours: item.RuntimeHours,
				TicketCount:  int32(item.TicketCount),
			})
		}

		for _, item := range rep.ChartByDay {
			resp.ChartByDay = append(resp.ChartByDay, &pb.DailyStatAggregateProto{
				Date:      item.Date,
				PlanQty:   item.PlanQty,
				ActualQty: item.ActualQty,
				PassQty:   item.PassQty,
				PassRate:  item.PassRate,
			})
		}

		resp.FilterTeams = rep.FilterOptions.Teams
		resp.FilterMachines = rep.FilterOptions.Machines
		resp.FilterShifts = rep.FilterOptions.Shifts
		resp.FilterDates = rep.FilterOptions.Dates

		for i := range rep.Items {
			resp.Items = append(resp.Items, mapProdStatsDetailToProto(&rep.Items[i].ERPProdStatsDetail))
		}

		resp.TotalRecords = rep.Pagination.Total
		resp.TotalPages = int32(rep.Pagination.TotalPages)
		resp.Page = int32(rep.Pagination.Page)
		resp.PageSize = int32(rep.Pagination.PageSize)
	}

	return resp, nil
}

// =========================================================================
// Helper mappers
// =========================================================================

func strVal(ptr *string) string {
	if ptr == nil {
		return ""
	}
	return *ptr
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// CÃ¡c trÆ°á»ng khÃ´ng pháº£i chuá»—i trong model chi tiáº¿t â€” giá»¯ nguyÃªn kiá»ƒu sá»‘/bool
var detailNonStringKeys = map[string]bool{
	"rowseq": true, "rowversion": true, "isactive": true,
}

// normalizeRowsJSON: chuyá»ƒn má»i Ã´ sá»‘/bool (tá»« Excel) thÃ nh chuá»—i Ä‘á»ƒ khá»›p model *string,
// bá» cÃ¡c trÆ°á»ng UI ná»™i bá»™ (báº¯t Ä‘áº§u báº±ng "_"). dropIdSeq=true sáº½ bá» IdSeq Ä‘á»ƒ server tá»± sinh UUIDv7.
func normalizeRowsJSON(rows []interface{}, dropIdSeq bool) ([]byte, error) {
	out := make([]map[string]interface{}, 0, len(rows))
	for _, r := range rows {
		m, ok := r.(map[string]interface{})
		if !ok {
			continue
		}
		clean := make(map[string]interface{}, len(m))
		for k, v := range m {
			if strings.HasPrefix(k, "_") || v == nil {
				continue
			}
			lk := strings.ToLower(k)
			if dropIdSeq && lk == "idseq" {
				continue
			}
			if detailNonStringKeys[lk] {
				switch tv := v.(type) {
				case string:
					if lk == "isactive" {
						clean[k] = tv == "true" || tv == "1"
					} else if n, err := strconv.ParseInt(strings.TrimSpace(tv), 10, 64); err == nil {
						clean[k] = n
					}
				default:
					clean[k] = tv
				}
				continue
			}
			switch tv := v.(type) {
			case string:
				clean[k] = tv
			case float64:
				clean[k] = strconv.FormatFloat(tv, 'f', -1, 64)
			case bool:
				clean[k] = strconv.FormatBool(tv)
			case map[string]interface{}, []interface{}:
				continue
			default:
				clean[k] = fmt.Sprintf("%v", tv)
			}
		}
		out = append(out, clean)
	}
	return json.Marshal(out)
}

// normalizeDataJSON: chuáº©n hÃ³a chuá»—i data_json dáº¡ng máº£ng (dÃ¹ng cho Add/Update chi tiáº¿t)
func normalizeDataJSON(dataJson string, dropIdSeq bool) []byte {
	var rows []interface{}
	if err := json.Unmarshal([]byte(dataJson), &rows); err != nil {
		return []byte(dataJson)
	}
	b, err := normalizeRowsJSON(rows, dropIdSeq)
	if err != nil {
		return []byte(dataJson)
	}
	return b
}

// extractRegistrationRowsJSON: láº¥y máº£ng dÃ²ng chi tiáº¿t tá»« body gá»‘c (filters_json do gateway náº¡p)
// theo thá»© tá»± Æ°u tiÃªn statsData/planData -> sheetData -> data, fallback data_json.
func extractRegistrationRowsJSON(req *pb.PlanRegistrationSaveProtoRequest, isStat bool) ([]byte, error) {
	var rows []interface{}

	if req.FiltersJson != "" {
		var body map[string]interface{}
		if err := json.Unmarshal([]byte(req.FiltersJson), &body); err == nil {
			keys := []string{"planData", "sheetData", "data", "statsData"}
			if isStat {
				keys = []string{"statsData", "sheetData", "data", "planData"}
			}
			for _, key := range keys {
				for bk, bv := range body {
					if !strings.EqualFold(bk, key) {
						continue
					}
					if arr, ok := bv.([]interface{}); ok && len(arr) > 0 {
						rows = arr
					}
				}
				if len(rows) > 0 {
					break
				}
			}
		}
	}

	if len(rows) == 0 && strings.TrimSpace(req.DataJson) != "" {
		if err := json.Unmarshal([]byte(req.DataJson), &rows); err != nil {
			return nil, fmt.Errorf("data_json khÃ´ng pháº£i máº£ng dá»¯ liá»‡u há»£p lá»‡: %w", err)
		}
	}

	if len(rows) == 0 {
		return nil, nil
	}
	return normalizeRowsJSON(rows, true)
}

func mapPlanMasterToProto(m *reportmodels.ERPPlanMaster) *pb.PlanMasterProtoItem {
	if m == nil {
		return nil
	}
	var createdDate, updatedDate string
	if m.CreatedAt != nil {
		createdDate = m.CreatedAt.Format(time.RFC3339)
	}
	if m.UpdatedAt != nil {
		updatedDate = m.UpdatedAt.Format(time.RFC3339)
	}

	return &pb.PlanMasterProtoItem{
		IdSeq:         m.IdSeq,
		RegCode:       m.RegCode,
		ReportType:    m.ReportType,
		FactoryName:   strVal(m.FactoryName),
		ApplyDate:     strVal(m.ApplyDate),
		Remark:        strVal(m.Remark),
		Status:        strVal(m.Status),
		TotalRows:     int32(m.TotalRows),
		RowVersion:    m.RowVersion,
		IsActive:      m.IsActive,
		CreatedBy:     strVal(m.CreatedBy),
		CreatedByName: strVal(m.CreatedByName),
		CreatedAt:     createdDate,
		UpdatedBy:     strVal(m.UpdatedBy),
		UpdatedByName: strVal(m.UpdatedByName),
		UpdatedAt:     updatedDate,
	}
}

func mapPlanDetailToProto(d *reportmodels.ERPPlanDetail) *pb.PlanDetailProtoItem {
	if d == nil {
		return nil
	}
	return &pb.PlanDetailProtoItem{
		IdSeq:            d.IdSeq,
		MasterSeq:        d.MasterSeq,
		RegCode:          d.RegCode,
		RowSeq:           int32(d.RowSeq),
		WorkingTag:       d.WorkingTag,
		PicDp:            strVal(d.PicDp),
		OperationNo:      strVal(d.OperationNo),
		OpDate:           strVal(d.OpDate),
		RoutingDocNo:     strVal(d.RoutingDocNo),
		RoutingDocDate:   strVal(d.RoutingDocDate),
		ItemCode:         strVal(d.ItemCode),
		ItemName:         strVal(d.ItemName),
		OperationName:    strVal(d.OperationName),
		OpTypeName:       strVal(d.OpTypeName),
		MachineName:      strVal(d.MachineName),
		Unit:             strVal(d.Unit),
		TargetPassQty:    strVal(d.TargetPassQty),
		TargetProdQty:    strVal(d.TargetProdQty),
		StatPassQty:      strVal(d.StatPassQty),
		StartTime:        strVal(d.StartTime),
		EndTime:          strVal(d.EndTime),
		StandardProdTime: strVal(d.StandardProdTime),
		ActualProdTime:   strVal(d.ActualProdTime),
		StandardCapa:     strVal(d.StandardCapa),
		ActualCapa:       strVal(d.ActualCapa),
		StatusDpSx:       strVal(d.StatusDpSx),
		TimeStatus:       strVal(d.TimeStatus),
		CapaStatus:       strVal(d.CapaStatus),
		UserMemo:         strVal(d.UserMemo),
		RowVersion:       d.RowVersion,
		IsActive:         d.IsActive,
	}
}

func protoToPlanDetailModel(p *pb.PlanDetailProtoItem) reportmodels.ERPPlanDetail {
	if p == nil {
		return reportmodels.ERPPlanDetail{}
	}
	return reportmodels.ERPPlanDetail{
		IdSeq:            p.IdSeq,
		MasterSeq:        p.MasterSeq,
		RegCode:          p.RegCode,
		RowSeq:           int(p.RowSeq),
		WorkingTag:       p.WorkingTag,
		PicDp:            strPtr(p.PicDp),
		OperationNo:      strPtr(p.OperationNo),
		OpDate:           strPtr(p.OpDate),
		RoutingDocNo:     strPtr(p.RoutingDocNo),
		RoutingDocDate:   strPtr(p.RoutingDocDate),
		ItemCode:         strPtr(p.ItemCode),
		ItemName:         strPtr(p.ItemName),
		OperationName:    strPtr(p.OperationName),
		OpTypeName:       strPtr(p.OpTypeName),
		MachineName:      strPtr(p.MachineName),
		Unit:             strPtr(p.Unit),
		TargetPassQty:    strPtr(p.TargetPassQty),
		TargetProdQty:    strPtr(p.TargetProdQty),
		StatPassQty:      strPtr(p.StatPassQty),
		StartTime:        strPtr(p.StartTime),
		EndTime:          strPtr(p.EndTime),
		StandardProdTime: strPtr(p.StandardProdTime),
		ActualProdTime:   strPtr(p.ActualProdTime),
		StandardCapa:     strPtr(p.StandardCapa),
		ActualCapa:       strPtr(p.ActualCapa),
		StatusDpSx:       strPtr(p.StatusDpSx),
		TimeStatus:       strPtr(p.TimeStatus),
		CapaStatus:       strPtr(p.CapaStatus),
		UserMemo:         strPtr(p.UserMemo),
		RowVersion:       p.RowVersion,
		IsActive:         p.IsActive,
	}
}

func mapProdStatsDetailToProto(d *reportmodels.ERPProdStatsDetail) *pb.ProdStatsDetailProtoItem {
	if d == nil {
		return nil
	}
	return &pb.ProdStatsDetailProtoItem{
		IdSeq:                  d.IdSeq,
		MasterSeq:              d.MasterSeq,
		RegCode:                d.RegCode,
		RowSeq:                 int32(d.RowSeq),
		WorkingTag:             d.WorkingTag,
		ItemCode:               strVal(d.ItemCode),
		ItemName:               strVal(d.ItemName),
		Version:                strVal(d.Version),
		Model:                  strVal(d.Model),
		DefectMarginWeight:     strVal(d.DefectMarginWeight),
		TechMarginWeight:       strVal(d.TechMarginWeight),
		OperationNo:            strVal(d.OperationNo),
		MainWorker:             strVal(d.MainWorker),
		SubWorker1:             strVal(d.SubWorker1),
		SubWorker2:             strVal(d.SubWorker2),
		BreakdownReason:        strVal(d.BreakdownReason),
		MachineCode:            strVal(d.MachineCode),
		MachineName:            strVal(d.MachineName),
		OpTypeCode:             strVal(d.OpTypeCode),
		OpTypeName:             strVal(d.OpTypeName),
		UvPlate:                strVal(d.UvPlate),
		MoldSetQty1:            strVal(d.MoldSetQty1),
		MoldSetQty2:            strVal(d.MoldSetQty2),
		MoldSetQty3:            strVal(d.MoldSetQty3),
		ProdQty:                strVal(d.ProdQty),
		PassQty:                strVal(d.PassQty),
		ActualMeters:           strVal(d.ActualMeters),
		StandardMeters:         strVal(d.StandardMeters),
		TeamName:               strVal(d.TeamName),
		Shift:                  strVal(d.Shift),
		StartDate:              strVal(d.StartDate),
		StartTime:              strVal(d.StartTime),
		EndDate:                strVal(d.EndDate),
		EndTime:                strVal(d.EndTime),
		StatDate:               strVal(d.StatDate),
		StatTicketNo:           strVal(d.StatTicketNo),
		StatStaff:              strVal(d.StatStaff),
		Customer:               strVal(d.Customer),
		SalesStaff:             strVal(d.SalesStaff),
		OrderNo:                strVal(d.OrderNo),
		ProcessName:            strVal(d.ProcessName),
		Unit:                   strVal(d.Unit),
		ConvUnit:               strVal(d.ConvUnit),
		ProcessSpec:            strVal(d.ProcessSpec),
		PartNo:                 strVal(d.PartNo),
		CorrugatedPartNo:       strVal(d.CorrugatedPartNo),
		TrimPartNo:             strVal(d.TrimPartNo),
		ColorQty:               strVal(d.ColorQty),
		OutPlateType:           strVal(d.OutPlateType),
		FrontColors:            strVal(d.FrontColors),
		BackColors:             strVal(d.BackColors),
		JobNumber:              strVal(d.JobNumber),
		Width:                  strVal(d.Width),
		Length:                 strVal(d.Length),
		Height:                 strVal(d.Height),
		ProductLine:            strVal(d.ProductLine),
		RawWidth:               strVal(d.RawWidth),
		RawLength:              strVal(d.RawLength),
		RawLineCode:            strVal(d.RawLineCode),
		RawLineName:            strVal(d.RawLineName),
		FlipType:               strVal(d.FlipType),
		BomPlates:              strVal(d.BomPlates),
		Coating:                strVal(d.Coating),
		SlitterBlades:          strVal(d.SlitterBlades),
		CodePositions:          strVal(d.CodePositions),
		PunchHoles:             strVal(d.PunchHoles),
		StructureCode:          strVal(d.StructureCode),
		StructureName:          strVal(d.StructureName),
		RoutingDocNo:           strVal(d.RoutingDocNo),
		RoutingDate:            strVal(d.RoutingDate),
		ReleaseDate:            strVal(d.ReleaseDate),
		TargetPassQty:          strVal(d.TargetPassQty),
		TargetProdQty:          strVal(d.TargetProdQty),
		RoutingUnit:            strVal(d.RoutingUnit),
		BreakdownMinutes:       strVal(d.BreakdownMinutes),
		WaitingMaterialMinutes: strVal(d.WaitingMaterialMinutes),
		SetupMinutes:           strVal(d.SetupMinutes),
		RepairMinutes:          strVal(d.RepairMinutes),
		TotalWasteMinutes:      strVal(d.TotalWasteMinutes),
		RigidBoxGlue:           strVal(d.RigidBoxGlue),
		Outsourcing:            strVal(d.Outsourcing),
		DefectQty:              strVal(d.DefectQty),
		DefectRate:             strVal(d.DefectRate),
		DefectUnit:             strVal(d.DefectUnit),
		Status:                 strVal(d.Status),
		AutoExport:             strVal(d.AutoExport),
		AutoImport:             strVal(d.AutoImport),
		ExportDocNo:            strVal(d.ExportDocNo),
		ImportDocNo:            strVal(d.ImportDocNo),
		WrongOpCode:            strVal(d.WrongOpCode),
		IsAdditionalStat:       strVal(d.IsAdditionalStat),
		TicketCreatedDate:      strVal(d.TicketCreatedDate),
		ActualRunTime:          strVal(d.ActualRunTime),
		ActualCapa:             strVal(d.ActualCapa),
		CheckPlanStatus:        strVal(d.CheckPlanStatus),
		MesApprovalTime:        strVal(d.MesApprovalTime),
		SyncDelayMinutes:       strVal(d.SyncDelayMinutes),
		IsDuplicateTicket:      strVal(d.IsDuplicateTicket),
		TicketCreationLocation: strVal(d.TicketCreationLocation),
		AutoIoStatus:           strVal(d.AutoIoStatus),
		UserMemo:               strVal(d.UserMemo),
		RowVersion:             d.RowVersion,
		IsActive:               d.IsActive,
	}
}

func protoToProdStatsDetailModel(d *pb.ProdStatsDetailProtoItem) reportmodels.ERPProdStatsDetail {
	if d == nil {
		return reportmodels.ERPProdStatsDetail{}
	}
	return reportmodels.ERPProdStatsDetail{
		IdSeq:                  d.IdSeq,
		MasterSeq:              d.MasterSeq,
		RegCode:                d.RegCode,
		RowSeq:                 int(d.RowSeq),
		WorkingTag:             d.WorkingTag,
		ItemCode:               strPtr(d.ItemCode),
		ItemName:               strPtr(d.ItemName),
		Version:                strPtr(d.Version),
		Model:                  strPtr(d.Model),
		DefectMarginWeight:     strPtr(d.DefectMarginWeight),
		TechMarginWeight:       strPtr(d.TechMarginWeight),
		OperationNo:            strPtr(d.OperationNo),
		MainWorker:             strPtr(d.MainWorker),
		SubWorker1:             strPtr(d.SubWorker1),
		SubWorker2:             strPtr(d.SubWorker2),
		BreakdownReason:        strPtr(d.BreakdownReason),
		MachineCode:            strPtr(d.MachineCode),
		MachineName:            strPtr(d.MachineName),
		OpTypeCode:             strPtr(d.OpTypeCode),
		OpTypeName:             strPtr(d.OpTypeName),
		UvPlate:                strPtr(d.UvPlate),
		MoldSetQty1:            strPtr(d.MoldSetQty1),
		MoldSetQty2:            strPtr(d.MoldSetQty2),
		MoldSetQty3:            strPtr(d.MoldSetQty3),
		ProdQty:                strPtr(d.ProdQty),
		PassQty:                strPtr(d.PassQty),
		ActualMeters:           strPtr(d.ActualMeters),
		StandardMeters:         strPtr(d.StandardMeters),
		TeamName:               strPtr(d.TeamName),
		Shift:                  strPtr(d.Shift),
		StartDate:              strPtr(d.StartDate),
		StartTime:              strPtr(d.StartTime),
		EndDate:                strPtr(d.EndDate),
		EndTime:                strPtr(d.EndTime),
		StatDate:               strPtr(d.StatDate),
		StatTicketNo:           strPtr(d.StatTicketNo),
		StatStaff:              strPtr(d.StatStaff),
		Customer:               strPtr(d.Customer),
		SalesStaff:             strPtr(d.SalesStaff),
		OrderNo:                strPtr(d.OrderNo),
		ProcessName:            strPtr(d.ProcessName),
		Unit:                   strPtr(d.Unit),
		ConvUnit:               strPtr(d.ConvUnit),
		ProcessSpec:            strPtr(d.ProcessSpec),
		PartNo:                 strPtr(d.PartNo),
		CorrugatedPartNo:       strPtr(d.CorrugatedPartNo),
		TrimPartNo:             strPtr(d.TrimPartNo),
		ColorQty:               strPtr(d.ColorQty),
		OutPlateType:           strPtr(d.OutPlateType),
		FrontColors:            strPtr(d.FrontColors),
		BackColors:             strPtr(d.BackColors),
		JobNumber:              strPtr(d.JobNumber),
		Width:                  strPtr(d.Width),
		Length:                 strPtr(d.Length),
		Height:                 strPtr(d.Height),
		ProductLine:            strPtr(d.ProductLine),
		RawWidth:               strPtr(d.RawWidth),
		RawLength:              strPtr(d.RawLength),
		RawLineCode:            strPtr(d.RawLineCode),
		RawLineName:            strPtr(d.RawLineName),
		FlipType:               strPtr(d.FlipType),
		BomPlates:              strPtr(d.BomPlates),
		Coating:                strPtr(d.Coating),
		SlitterBlades:          strPtr(d.SlitterBlades),
		CodePositions:          strPtr(d.CodePositions),
		PunchHoles:             strPtr(d.PunchHoles),
		StructureCode:          strPtr(d.StructureCode),
		StructureName:          strPtr(d.StructureName),
		RoutingDocNo:           strPtr(d.RoutingDocNo),
		RoutingDate:            strPtr(d.RoutingDate),
		ReleaseDate:            strPtr(d.ReleaseDate),
		TargetPassQty:          strPtr(d.TargetPassQty),
		TargetProdQty:          strPtr(d.TargetProdQty),
		RoutingUnit:            strPtr(d.RoutingUnit),
		BreakdownMinutes:       strPtr(d.BreakdownMinutes),
		WaitingMaterialMinutes: strPtr(d.WaitingMaterialMinutes),
		SetupMinutes:           strPtr(d.SetupMinutes),
		RepairMinutes:          strPtr(d.RepairMinutes),
		TotalWasteMinutes:      strPtr(d.TotalWasteMinutes),
		RigidBoxGlue:           strPtr(d.RigidBoxGlue),
		Outsourcing:            strPtr(d.Outsourcing),
		DefectQty:              strPtr(d.DefectQty),
		DefectRate:             strPtr(d.DefectRate),
		DefectUnit:             strPtr(d.DefectUnit),
		Status:                 strPtr(d.Status),
		AutoExport:             strPtr(d.AutoExport),
		AutoImport:             strPtr(d.AutoImport),
		ExportDocNo:            strPtr(d.ExportDocNo),
		ImportDocNo:            strPtr(d.ImportDocNo),
		WrongOpCode:            strPtr(d.WrongOpCode),
		IsAdditionalStat:       strPtr(d.IsAdditionalStat),
		TicketCreatedDate:      strPtr(d.TicketCreatedDate),
		ActualRunTime:          strPtr(d.ActualRunTime),
		ActualCapa:             strPtr(d.ActualCapa),
		CheckPlanStatus:        strPtr(d.CheckPlanStatus),
		MesApprovalTime:        strPtr(d.MesApprovalTime),
		SyncDelayMinutes:       strPtr(d.SyncDelayMinutes),
		IsDuplicateTicket:      strPtr(d.IsDuplicateTicket),
		TicketCreationLocation: strPtr(d.TicketCreationLocation),
		AutoIoStatus:           strPtr(d.AutoIoStatus),
		RowVersion:             d.RowVersion,
		IsActive:               d.IsActive,
	}
}

// 13. QueryCodeHelp (Dynamic lookup for Users, Menus, Roles, etc.)
func (s *Server) QueryCodeHelp(ctx context.Context, req *pb.CodeHelpProtoRequest) (*pb.CodeHelpProtoResponse, error) {
	if s.helpService == nil {
		return &pb.CodeHelpProtoResponse{
			Success:  false,
			Message:  "CodeHelp service not initialized",
			DataJson: "[]",
		}, nil
	}

	params := help.CodeHelpParams{
		CodeHelpName: req.CodeHelpName,
		TableName:    req.TableName,
		KeyType:      req.KeyType,
		KeyValue:     req.KeyValue,
		Search:       req.Search,
		KeyItem1:     req.KeyItem1,
		KeyItem2:     req.KeyItem2,
		KeyItem3:     req.KeyItem3,
		Page:         req.Page,
		Limit:        req.Limit,
	}

	rows, err := s.helpService.QueryCodeHelp(ctx, params)
	if err != nil {
		return &pb.CodeHelpProtoResponse{
			Success:  false,
			Message:  err.Error(),
			DataJson: "[]",
		}, nil
	}

	dataBytes, _ := json.Marshal(rows)
	return &pb.CodeHelpProtoResponse{
		Success:  true,
		Message:  "2000",
		DataJson: string(dataBytes),
	}, nil
}

// =========================================================================
// 9. Production Calculation Compressed Bundles (.gsprod packages)
// =========================================================================

func (s *Server) PublishProductionBundle(ctx context.Context, req *pb.PublishProductionBundleProtoRequest) (*pb.PublishProductionBundleProtoResponse, error) {
	if req == nil || req.RegCode == "" {
		return &pb.PublishProductionBundleProtoResponse{
			Success:      false,
			Message:      "Mã đăng ký (reg_code) là bắt buộc",
			ErrorMessage: "Mã đăng ký (reg_code) là bắt buộc",
		}, nil
	}

	bundleBytes := req.BundleData
	if len(bundleBytes) == 0 && req.BundleBase64 != "" {
		if decoded, err := base64.StdEncoding.DecodeString(req.BundleBase64); err == nil {
			bundleBytes = decoded
		}
	}

	version := req.Version
	if version == "" {
		version = "1.0"
	}

	status := req.Status
	if status == "" {
		status = "PUBLISHED"
	}

	// 1. Sinh tên file & đường dẫn phân cấp theo Năm/Tháng/Ngày
	now := time.Now()
	year := fmt.Sprintf("%04d", now.Year())
	month := fmt.Sprintf("%02d", int(now.Month()))
	day := fmt.Sprintf("%02d", now.Day())

	if req.ApplyDate != "" {
		cleaned := strings.ReplaceAll(req.ApplyDate, "-", "")
		cleaned = strings.ReplaceAll(cleaned, "/", "")
		if len(cleaned) >= 8 {
			year = cleaned[0:4]
			month = cleaned[4:6]
			day = cleaned[6:8]
		}
	}

	factoryClean := handlers.CleanStorageSlug(req.FactoryName)
	teamClean := handlers.CleanStorageSlug(req.ProductionTeam)
	regCodeClean := handlers.CleanStorageSlug(req.RegCode)
	dateClean := year + month + day

	versionClean := strings.TrimPrefix(version, "v")
	versionClean = strings.TrimPrefix(versionClean, "V")

	// Đọc STORAGE_ROOT_PATH từ biến môi trường .env (mặc định "storage")
	rootPath := os.Getenv("STORAGE_ROOT_PATH")
	if rootPath == "" {
		rootPath = "storage"
	}
	rootPath = filepath.Clean(rootPath)

	fileName := fmt.Sprintf("KHSX_%s_%s_%s_%s_v%s.gsprod", factoryClean, teamClean, dateClean, regCodeClean, versionClean)
	// relPath luôn dùng chuẩn POSIX "/" để lưu vào Database đồng nhất trên mọi OS
	relPath := fmt.Sprintf("/ke_hoach_san_xuat/%s/%s/%s/%s/%s/%s", factoryClean, year, month, day, teamClean, fileName)
	dirPath := filepath.Join(rootPath, "ke_hoach_san_xuat", factoryClean, year, month, day, teamClean)
	fullPath := filepath.Join(dirPath, fileName)

	// 2. Ghi file vật lý ra ổ đĩa (tương thích cả Windows, MacOS và Linux Server)
	if len(bundleBytes) > 0 {
		dir := filepath.Dir(fullPath)
		if err := os.MkdirAll(dir, 0755); err == nil {
			if writeErr := os.WriteFile(fullPath, bundleBytes, 0644); writeErr != nil {
				s.logger.Warn("[gRPC] Không thể ghi file ra ổ đĩa", zap.String("path", fullPath), zap.Error(writeErr))
			}
		}
	}

	bundle := reportmodels.CalcProductionBundle{
		RegCode:          req.RegCode,
		Version:          version,
		FileName:         fileName,
		FilePath:         relPath,
		StorageDisk:      "local",
		FactoryName:      req.FactoryName,
		ApplyDate:        req.ApplyDate,
		ProductionTeam:   req.ProductionTeam,
		Status:           status,
		TotalRows:        int(req.TotalRows),
		RawSizeMB:        req.RawSizeMb,
		CompressedSizeMB: req.CompressedSizeMb,
		CompressionRatio: req.CompressionRatio,
		BundleData:       bundleBytes,
		FileSummaries:    req.FileSummaries,
		CalcSummary:      req.CalcSummary,
		Remark:           req.Remark,
		CreatedBy:        req.CreatedBy,
	}

	// 3. Upsert vào PostgreSQL trên cặp khóa (RegCode, Version) để lưu vết lịch sử nhiều version
	err := s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "RegCode"}, {Name: "Version"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"FileName", "FilePath", "StorageDisk", "FactoryName", "ApplyDate", "ProductionTeam", "Status",
			"TotalRows", "RawSizeMB", "CompressedSizeMB", "CompressionRatio",
			"BundleData", "FileSummaries", "CalcSummary", "Remark", "UpdatedAt",
		}),
	}).Create(&bundle).Error

	if err != nil {
		s.logger.Error("[gRPC] Lỗi lưu gói production bundle", zap.Error(err), zap.String("reg_code", req.RegCode))
		return &pb.PublishProductionBundleProtoResponse{
			Success:      false,
			Message:      "Không thể lưu gói dữ liệu lên server: " + err.Error(),
			ErrorMessage: err.Error(),
		}, nil
	}

	s.logger.Info("[gRPC] Đã công bố thành công gói production bundle",
		zap.String("reg_code", bundle.RegCode),
		zap.String("version", bundle.Version),
		zap.String("file_path", bundle.FilePath),
		zap.Int("bytes", len(bundle.BundleData)),
	)

	return &pb.PublishProductionBundleProtoResponse{
		Success:          true,
		Message:          "Công bố và lưu trữ gói dữ liệu lên Server DataHub thành công!",
		RegCode:          bundle.RegCode,
		Version:          bundle.Version,
		CompressedSizeMb: bundle.CompressedSizeMB,
		CompressionRatio: bundle.CompressionRatio,
	}, nil
}

func (s *Server) QueryProductionBundles(ctx context.Context, req *pb.QueryProductionBundlesProtoRequest) (*pb.QueryProductionBundlesProtoResponse, error) {
	page := int(req.GetPage())
	pageSize := int(req.GetPageSize())
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 500 {
		pageSize = 50
	}

	type bundleQueryResult struct {
		reportmodels.CalcProductionBundle
		CreatedByName string `gorm:"column:CreatedByName"`
	}

	query := s.db.WithContext(ctx).Table(`"_ERPProductionBundle" AS b`).
		Select(`b."Id", b."RegCode", b."FactoryName", b."ApplyDate", b."ProductionTeam", b."Status", b."Version", b."FileName", b."FilePath", b."StorageDisk", b."TotalRows", b."RawSizeMB", b."CompressedSizeMB", b."CompressionRatio", b."FileSummaries", b."CalcSummary", b."Remark", b."CreatedBy", COALESCE(NULLIF(u."UserName", ''), NULLIF(u."EmpName", ''), NULLIF(u."UserId", ''), b."CreatedBy") AS "CreatedByName", b."CreatedAt", b."UpdatedAt"`).
		Joins(`LEFT JOIN "_ERPUsers" AS u ON u."UserSeq"::text = b."CreatedBy" OR LOWER(u."UserId") = LOWER(b."CreatedBy")`)

	if req.GetFactoryName() != "" && req.GetFactoryName() != "Tất cả" {
		query = query.Where(`b."FactoryName" = ?`, req.GetFactoryName())
	}
	if req.GetProductionTeam() != "" && req.GetProductionTeam() != "Tất cả" {
		query = query.Where(`b."ProductionTeam" = ?`, req.GetProductionTeam())
	}
	if req.GetStatus() != "" && req.GetStatus() != "Tất cả" {
		query = query.Where(`b."Status" = ?`, req.GetStatus())
	}
	if req.GetApplyDateFrom() != "" {
		query = query.Where(`b."ApplyDate" >= ?`, req.GetApplyDateFrom())
	}
	if req.GetApplyDateTo() != "" {
		query = query.Where(`b."ApplyDate" <= ?`, req.GetApplyDateTo())
	}
	if req.GetKeyword() != "" {
		like := "%" + req.GetKeyword() + "%"
		query = query.Where(`(b."RegCode" ILIKE ? OR b."Remark" ILIKE ? OR b."CreatedBy" ILIKE ? OR u."UserName" ILIKE ? OR u."EmpName" ILIKE ? OR u."UserId" ILIKE ?)`, like, like, like, like, like, like)
	}

	var totalRecords int64
	query.Count(&totalRecords)

	var items []bundleQueryResult
	err := query.Order(`b."CreatedAt" DESC`).
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&items).Error

	if err != nil {
		return &pb.QueryProductionBundlesProtoResponse{
			Success:      false,
			Message:      "Lỗi truy vấn danh sách gói: " + err.Error(),
			ErrorMessage: err.Error(),
		}, nil
	}

	protoItems := make([]*pb.ProductionBundleProtoItem, len(items))
	for i, it := range items {
		displayName := it.CreatedByName
		if displayName == "" {
			displayName = it.CreatedBy
		}
		if displayName == "" {
			displayName = "Admin"
		}

		protoItems[i] = &pb.ProductionBundleProtoItem{
			Id:               uint32(it.ID),
			RegCode:          it.RegCode,
			FactoryName:      it.FactoryName,
			ApplyDate:        it.ApplyDate,
			ProductionTeam:   it.ProductionTeam,
			Status:           it.Status,
			Version:          it.Version,
			TotalRows:        int32(it.TotalRows),
			RawSizeMb:        it.RawSizeMB,
			CompressedSizeMb: it.CompressedSizeMB,
			CompressionRatio: it.CompressionRatio,
			FileSummaries:    it.FileSummaries,
			CalcSummary:      it.CalcSummary,
			Remark:           it.Remark,
			CreatedBy:        displayName,
			CreatedAt:        it.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:        it.UpdatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	return &pb.QueryProductionBundlesProtoResponse{
		Success:      true,
		Message:      "Truy vấn thành công",
		Data:         protoItems,
		TotalRecords: totalRecords,
		Page:         int32(page),
		PageSize:     int32(pageSize),
	}, nil
}

func (s *Server) GetProductionBundleData(ctx context.Context, req *pb.GetProductionBundleDataProtoRequest) (*pb.GetProductionBundleDataProtoResponse, error) {
	if req == nil || req.RegCode == "" {
		return &pb.GetProductionBundleDataProtoResponse{
			Success:      false,
			Message:      "Mã đăng ký (reg_code) là bắt buộc",
			ErrorMessage: "Mã đăng ký (reg_code) là bắt buộc",
		}, nil
	}

	rawRegCode := req.GetRegCode()
	regCode := rawRegCode
	version := ""

	if strings.Contains(rawRegCode, "@v") {
		parts := strings.Split(rawRegCode, "@v")
		regCode = parts[0]
		version = parts[1]
	} else if strings.Contains(rawRegCode, "@") {
		parts := strings.Split(rawRegCode, "@")
		regCode = parts[0]
		version = parts[1]
	}

	var bundle reportmodels.CalcProductionBundle
	query := s.db.WithContext(ctx).Where("\"RegCode\" = ?", regCode)
	if version != "" {
		query = query.Where("\"Version\" = ?", version)
	} else {
		query = query.Order("\"Version\" DESC, \"CreatedAt\" DESC")
	}

	err := query.First(&bundle).Error
	if err != nil {
		return &pb.GetProductionBundleDataProtoResponse{
			Success:      false,
			Message:      "Không tìm thấy gói dữ liệu: " + req.RegCode,
			ErrorMessage: err.Error(),
		}, nil
	}

	bundleBytes := bundle.BundleData
	if len(bundleBytes) == 0 && bundle.FilePath != "" {
		rootPath := os.Getenv("STORAGE_ROOT_PATH")
		if rootPath == "" {
			rootPath = "storage"
		}
		rootPath = filepath.Clean(rootPath)

		// Chuẩn hóa đường dẫn từ DB sang hệ điều hành hiện tại (Windows / macOS / Linux)
		cleanRel := strings.TrimPrefix(bundle.FilePath, "/")
		cleanRel = strings.TrimPrefix(cleanRel, "\\")
		diskPath := filepath.Join(rootPath, filepath.FromSlash(cleanRel))

		if data, readErr := os.ReadFile(diskPath); readErr == nil && len(data) > 0 {
			bundleBytes = data
		}
	}

	return &pb.GetProductionBundleDataProtoResponse{
		Success:    true,
		Message:    "Lấy gói dữ liệu thành công",
		RegCode:    bundle.RegCode,
		Version:    bundle.Version,
		BundleData: bundleBytes,
		TotalRows:  int32(bundle.TotalRows),
	}, nil
}

func (s *Server) DeleteProductionBundle(ctx context.Context, req *pb.DeleteProductionBundleProtoRequest) (*pb.DeleteProductionBundleProtoResponse, error) {
	if req == nil || req.RegCode == "" {
		return &pb.DeleteProductionBundleProtoResponse{
			Success:      false,
			Message:      "Mã đăng ký (reg_code) là bắt buộc",
			ErrorMessage: "Mã đăng ký (reg_code) là bắt buộc",
		}, nil
	}

	cleanCode := strings.TrimSpace(req.RegCode)
	res := s.db.WithContext(ctx).Exec(`DELETE FROM "_ERPProductionBundle" WHERE LOWER(TRIM("RegCode")) = LOWER(?)`, cleanCode)
	if res.Error != nil {
		return &pb.DeleteProductionBundleProtoResponse{
			Success:      false,
			Message:      "Lỗi xóa gói dữ liệu: " + res.Error.Error(),
			ErrorMessage: res.Error.Error(),
		}, nil
	}

	// Đồng thời dọn dẹp các bản ghi tương ứng trong các bảng liên quan nếu có
	s.db.WithContext(ctx).Exec(`DELETE FROM plan_master WHERE LOWER(TRIM("reg_code")) = LOWER(?)`, cleanCode)
	s.db.WithContext(ctx).Exec(`DELETE FROM plan_registration WHERE LOWER(TRIM("reg_code")) = LOWER(?)`, cleanCode)
	s.db.WithContext(ctx).Exec(`DELETE FROM plan_detail WHERE LOWER(TRIM("reg_code")) = LOWER(?)`, cleanCode)
	s.db.WithContext(ctx).Exec(`DELETE FROM prod_stats_detail WHERE LOWER(TRIM("reg_code")) = LOWER(?)`, cleanCode)

	return &pb.DeleteProductionBundleProtoResponse{
		Success:     true,
		Message:     "Đã xóa gói dữ liệu thành công",
		DeletedRows: res.RowsAffected,
	}, nil
}

// RunGRPCServer launches the gRPC server listening on the specified port
func RunGRPCServer(
	port string,
	db *gorm.DB,
	loginService *services.LoginService,
	configService *services.ConfigService,
	workProcessService *services.WorkProcessService,
	factoryService *services.FactoryService,
	planMasterService *plan_master.PlanMasterService,
	planDetailService *plan_detail.PlanDetailService,
	prodStatsDetailService *prod_stats_detail.ProdStatsDetailService,
	planReportService *plan_report.PlanReportService,
	helpService *help.CodeHelpService,
	logger *zap.Logger,
) (*grpc.Server, net.Listener, error) {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to listen on gRPC port %s: %w", port, err)
	}

	opts := []grpc.ServerOption{
		grpc.KeepaliveParams(keepalive.ServerParameters{
			MaxConnectionIdle:     15 * time.Minute,
			MaxConnectionAge:      30 * time.Minute,
			MaxConnectionAgeGrace: 5 * time.Second,
			Time:                  1 * time.Minute,
			Timeout:               20 * time.Second,
		}),
		grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
			MinTime:             20 * time.Second,
			PermitWithoutStream: true,
		}),
		grpc.MaxRecvMsgSize(32 * 1024 * 1024), // 32MB payload support
		grpc.MaxSendMsgSize(32 * 1024 * 1024),
	}

	grpcServer := grpc.NewServer(opts...)
	datahubServer := NewServer(
		db,
		loginService,
		configService,
		workProcessService,
		factoryService,
		planMasterService,
		planDetailService,
		prodStatsDetailService,
		planReportService,
		helpService,
		logger,
	)
	pb.RegisterDataHubServiceServer(grpcServer, datahubServer)

	return grpcServer, lis, nil
}
