package services

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"service-datahub/models"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type LoginService struct {
	db            *gorm.DB
	configService *ConfigService
	logger        *zap.Logger
}

func NewLoginService(db *gorm.DB, configService *ConfigService, logger *zap.Logger) *LoginService {
	return &LoginService{
		db:            db,
		configService: configService,
		logger:        logger,
	}
}

// Login authenticates a user against external ERP using the specified ErpConfig from DATAHUB DB
func (s *LoginService) Login(ctx context.Context, clientIP, userAgent string, req *models.LoginRequest) (*models.LoginResponse, error) {
	traceID := uuid.New().String()
	startTime := time.Now()

	configKey := req.ConfigKey
	if configKey == "" {
		configKey = "BravoDefault"
	}

	// 1. Get ERP configuration from DATAHUB DB
	erpCfg, err := s.configService.GetConfigByKey(ctx, configKey)
	if err != nil {
		s.logAudit(&models.AuditLog{
			TraceId:        traceID,
			ConfigKey:      configKey,
			Username:       req.Username,
			Method:         http.MethodPost,
			Endpoint:       "/api/v1/auth/login",
			StatusCode:     http.StatusBadRequest,
			LatencyMs:      time.Since(startTime).Milliseconds(),
			ClientIp:       clientIP,
			UserAgent:      userAgent,
			RequestPayload: fmt.Sprintf(`{"username":"%s","config_key":"%s"}`, req.Username, configKey),
			ErrorMessage:   err.Error(),
		})
		return nil, err
	}

	if !erpCfg.IsActive {
		return nil, fmt.Errorf("ERP configuration '%s' is currently inactive", configKey)
	}

	// 2. Prepare OAuth request payload
	formData := url.Values{}
	formData.Set("client_id", erpCfg.ClientId)
	formData.Set("client_secret", erpCfg.ClientSecret)
	formData.Set("device_code", erpCfg.DeviceCode)
	formData.Set("connectionName", erpCfg.ConnectionName)
	formData.Set("grant_type", erpCfg.GrantType)
	formData.Set("scope", erpCfg.Scope)
	formData.Set("username", req.Username)
	formData.Set("password", req.Password)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, erpCfg.AuthUrl, strings.NewReader(formData.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create ERP auth request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("Accept", "application/json, text/plain, */*")
	if erpCfg.Referer != "" {
		httpReq.Header.Set("Referer", erpCfg.Referer)
	}
	httpReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	// Custom HTTP client with TLS skip verify if configured
	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: erpCfg.InsecureSkipVerify,
			},
		},
		Timeout: 20 * time.Second,
	}

	// 3. Send OAuth request to ERP
	httpResp, err := httpClient.Do(httpReq)
	latency := time.Since(startTime).Milliseconds()

	var statusCode int = 500
	if httpResp != nil {
		statusCode = httpResp.StatusCode
	}

	if err != nil {
		s.logAudit(&models.AuditLog{
			TraceId:        traceID,
			ConfigKey:      configKey,
			Username:       req.Username,
			Method:         http.MethodPost,
			Endpoint:       "/api/v1/auth/login",
			TargetUrl:      erpCfg.AuthUrl,
			StatusCode:     statusCode,
			LatencyMs:      latency,
			ClientIp:       clientIP,
			UserAgent:      userAgent,
			RequestPayload: fmt.Sprintf(`{"username":"%s","config_key":"%s"}`, req.Username, configKey),
			ErrorMessage:   fmt.Sprintf("Failed to connect to ERP server: %v", err),
		})
		return nil, fmt.Errorf("failed to connect to ERP server: %w", err)
	}
	defer httpResp.Body.Close()

	respBytes, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read ERP auth response body: %w", err)
	}

	var responseBrief string
	if len(respBytes) > 500 {
		responseBrief = string(respBytes[:500]) + "... (truncated)"
	} else {
		responseBrief = string(respBytes)
	}

	// 4. Handle non-200 response
	if statusCode != http.StatusOK {
		var errOAuth models.BravoOAuthTokenResponse
		_ = json.Unmarshal(respBytes, &errOAuth)

		errMsg := "Invalid username, password, or ERP credentials"
		if errOAuth.ErrorDesc != "" {
			errMsg = errOAuth.ErrorDesc
		} else if errOAuth.Error != "" {
			errMsg = errOAuth.Error
		}

		s.logAudit(&models.AuditLog{
			TraceId:        traceID,
			ConfigKey:      configKey,
			Username:       req.Username,
			Method:         http.MethodPost,
			Endpoint:       "/api/v1/auth/login",
			TargetUrl:      erpCfg.AuthUrl,
			StatusCode:     statusCode,
			LatencyMs:      latency,
			ClientIp:       clientIP,
			UserAgent:      userAgent,
			RequestPayload: fmt.Sprintf(`{"username":"%s","config_key":"%s"}`, req.Username, configKey),
			ResponseBrief:  responseBrief,
			ErrorMessage:   errMsg,
		})

		return nil, errors.New(errMsg)
	}

	// 5. Parse OAuth Token
	var tokenResp models.BravoOAuthTokenResponse
	if err := json.Unmarshal(respBytes, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse ERP OAuth token JSON: %w", err)
	}

	if tokenResp.AccessToken == "" {
		return nil, errors.New("empty access_token received from ERP")
	}

	expiresIn := tokenResp.ExpiresIn
	if expiresIn <= 0 {
		expiresIn = 3600 // Default 1 hour
	}
	expiresAt := time.Now().Add(time.Duration(expiresIn) * time.Second)

	// 6. Save TokenSession to DATAHUB DB
	session := models.TokenSession{
		ConfigKey:    configKey,
		Username:     req.Username,
		AccessToken:  tokenResp.AccessToken,
		TokenType:    tokenResp.TokenType,
		RefreshToken: tokenResp.RefreshToken,
		ExpiresIn:    expiresIn,
		ExpiresAt:    expiresAt,
		Scope:        tokenResp.Scope,
		RawResponse:  string(respBytes),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	var existingSession models.TokenSession
	errSession := s.db.WithContext(ctx).Where("\"ConfigKey\" = ? AND \"Username\" = ?", configKey, req.Username).First(&existingSession).Error
	if errSession != nil {
		if errors.Is(errSession, gorm.ErrRecordNotFound) {
			if createErr := s.db.WithContext(ctx).Create(&session).Error; createErr != nil {
				s.logger.Warn("Failed to create TokenSession in DATAHUB DB", zap.Error(createErr))
			}
		}
	} else {
		if updateErr := s.db.WithContext(ctx).Model(&existingSession).Updates(map[string]interface{}{
			"AccessToken":  tokenResp.AccessToken,
			"TokenType":    tokenResp.TokenType,
			"RefreshToken": tokenResp.RefreshToken,
			"ExpiresIn":    expiresIn,
			"ExpiresAt":    expiresAt,
			"Scope":        tokenResp.Scope,
			"RawResponse":  string(respBytes),
			"UpdatedAt":    time.Now(),
		}).Error; updateErr != nil {
			s.logger.Warn("Failed to update TokenSession in DATAHUB DB", zap.Error(updateErr))
		}
		session.Id = existingSession.Id
	}

	// 7. Record Audit Log
	s.logAudit(&models.AuditLog{
		TraceId:        traceID,
		ConfigKey:      configKey,
		Username:       req.Username,
		Method:         http.MethodPost,
		Endpoint:       "/api/v1/auth/login",
		TargetUrl:      erpCfg.AuthUrl,
		StatusCode:     statusCode,
		LatencyMs:      latency,
		ClientIp:       clientIP,
		UserAgent:      userAgent,
		RequestPayload: fmt.Sprintf(`{"username":"%s","config_key":"%s"}`, req.Username, configKey),
		ResponseBrief:  "Login successful, access token acquired",
	})

	return &models.LoginResponse{
		Success:      true,
		ConfigKey:    configKey,
		Username:     req.Username,
		AccessToken:  tokenResp.AccessToken,
		RefreshToken: tokenResp.RefreshToken,
		TokenType:    tokenResp.TokenType,
		ExpiresIn:    expiresIn,
		ExpiresAt:    expiresAt.Format(time.RFC3339),
		Scope:        tokenResp.Scope,
		TokenSession: &session,
	}, nil
}

// GetTokenSession retrieves active token session for a user + configKey
func (s *LoginService) GetTokenSession(ctx context.Context, configKey, username string) (*models.TokenSession, error) {
	if configKey == "" {
		configKey = "BravoDefault"
	}

	var session models.TokenSession
	err := s.db.WithContext(ctx).
		Where("\"ConfigKey\" = ? AND \"Username\" = ? AND \"ExpiresAt\" > ?", configKey, username, time.Now().Add(1*time.Minute)).
		First(&session).Error
	if err != nil {
		return nil, errors.New("active token session not found or expired")
	}

	return &session, nil
}

// ForwardToErp proxies requests to ERP endpoint using valid TokenSession and records audit log
func (s *LoginService) ForwardToErp(ctx context.Context, clientIP, userAgent string, req *models.ProxyForwardRequest) (*models.ApiResponse, error) {
	traceID := uuid.New().String()
	startTime := time.Now()

	configKey := req.ConfigKey
	if configKey == "" {
		configKey = "BravoDefault"
	}

	// 1. Get ERP Config
	erpCfg, err := s.configService.GetConfigByKey(ctx, configKey)
	if err != nil {
		return nil, err
	}

	// 2. Get active token session
	tokenSession, err := s.GetTokenSession(ctx, configKey, req.Username)
	if err != nil {
		return nil, fmt.Errorf("authorization required: %w", err)
	}

	// 3. Build destination URL
	baseURL := strings.TrimRight(erpCfg.BaseApiUrl, "/")
	targetPath := strings.TrimLeft(req.Path, "/")
	fullURL := fmt.Sprintf("%s/%s", baseURL, targetPath)

	if len(req.Params) > 0 {
		q := url.Values{}
		for k, v := range req.Params {
			q.Set(k, v)
		}
		fullURL = fmt.Sprintf("%s?%s", fullURL, q.Encode())
	}

	var bodyReader io.Reader
	var reqBodyStr string
	if req.Body != nil {
		bodyBytes, err := json.Marshal(req.Body)
		if err == nil {
			bodyReader = bytes.NewReader(bodyBytes)
			reqBodyStr = string(bodyBytes)
		}
	}

	method := req.Method
	if method == "" {
		method = http.MethodGet
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, fullURL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to construct proxy request: %w", err)
	}

	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tokenSession.AccessToken))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json, text/plain, */*")
	if erpCfg.Referer != "" {
		httpReq.Header.Set("Referer", erpCfg.Referer)
	}
	httpReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	for k, v := range req.Headers {
		httpReq.Header.Set(k, v)
	}

	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: erpCfg.InsecureSkipVerify,
			},
		},
		Timeout: 30 * time.Second,
	}

	resp, err := httpClient.Do(httpReq)
	latency := time.Since(startTime).Milliseconds()

	var statusCode int = 500
	if resp != nil {
		statusCode = resp.StatusCode
	}

	var respBytes []byte
	if resp != nil {
		defer resp.Body.Close()
		respBytes, _ = io.ReadAll(resp.Body)
	}

	var responseBrief string
	if len(respBytes) > 500 {
		responseBrief = string(respBytes[:500]) + "... (truncated)"
	} else {
		responseBrief = string(respBytes)
	}

	var errMsg string
	if err != nil {
		errMsg = err.Error()
	}

	// Record audit log asynchronously
	go s.logAudit(&models.AuditLog{
		TraceId:        traceID,
		ConfigKey:      configKey,
		Username:       req.Username,
		Method:         method,
		Endpoint:       req.Path,
		TargetUrl:      fullURL,
		StatusCode:     statusCode,
		LatencyMs:      latency,
		ClientIp:       clientIP,
		UserAgent:      userAgent,
		RequestPayload: reqBodyStr,
		ResponseBrief:  responseBrief,
		ErrorMessage:   errMsg,
	})

	if err != nil {
		return nil, fmt.Errorf("ERP upstream call failed: %w", err)
	}

	var respData interface{}
	if err := json.Unmarshal(respBytes, &respData); err != nil {
		respData = string(respBytes)
	}

	return &models.ApiResponse{
		Success: statusCode >= 200 && statusCode < 300,
		Data:    respData,
		Meta: map[string]interface{}{
			"trace_id":    traceID,
			"latency_ms":  latency,
			"status_code": statusCode,
		},
	}, nil
}

// GetAuditLogs retrieves audit trail
func (s *LoginService) GetAuditLogs(ctx context.Context, configKey string, limit, offset int) ([]models.AuditLog, int64, error) {
	var logs []models.AuditLog
	var total int64

	query := s.db.WithContext(ctx).Model(&models.AuditLog{})
	if configKey != "" {
		query = query.Where("\"ConfigKey\" = ?", configKey)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if limit <= 0 {
		limit = 50
	}

	err := query.Order("\"CreatedAt\" DESC").Limit(limit).Offset(offset).Find(&logs).Error
	return logs, total, err
}

func (s *LoginService) logAudit(log *models.AuditLog) {
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now()
	}
	if err := s.db.Create(log).Error; err != nil {
		s.logger.Error("Failed to write audit log to DATAHUB DB", zap.Error(err))
	}
}
