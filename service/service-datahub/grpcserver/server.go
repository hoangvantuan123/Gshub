package grpcserver

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"time"

	"service-datahub/models"
	pb "service-datahub/pb/datahub"
	"service-datahub/services"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"
)

type Server struct {
	pb.UnimplementedDataHubServiceServer
	db            *gorm.DB
	loginService  *services.LoginService
	configService *services.ConfigService
	logger        *zap.Logger
	startTime     time.Time
}

func NewServer(
	db *gorm.DB,
	loginService *services.LoginService,
	configService *services.ConfigService,
	logger *zap.Logger,
) *Server {
	return &Server{
		db:            db,
		loginService:  loginService,
		configService: configService,
		logger:        logger,
		startTime:     time.Now(),
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
		Success:      true,
		ConfigKey:    resp.ConfigKey,
		Username:     resp.Username,
		AccessToken:  resp.AccessToken,
		TokenType:    resp.TokenType,
		ExpiresIn:    resp.ExpiresIn,
		ExpiresAt:    resp.ExpiresAt,
		Scope:        resp.Scope,
		Session:      sessionProto,
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

		// Handle request in goroutine or synchronously per frame
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

// RunGRPCServer launches the gRPC server listening on the specified port
func RunGRPCServer(
	port string,
	db *gorm.DB,
	loginService *services.LoginService,
	configService *services.ConfigService,
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
	datahubServer := NewServer(db, loginService, configService, logger)
	pb.RegisterDataHubServiceServer(grpcServer, datahubServer)

	return grpcServer, lis, nil
}
