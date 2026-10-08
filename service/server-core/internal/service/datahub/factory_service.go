package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"service-datahub/bravo"
	"service-datahub/config"
	"service-datahub/models"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

type FactoryService struct {
	cfg           *config.Config
	db            *gorm.DB
	configService *ConfigService
	loginService  *LoginService
	bravoClient   *bravo.Client
	logger        *zap.Logger
}

func NewFactoryService(
	cfg *config.Config,
	db *gorm.DB,
	configService *ConfigService,
	loginService *LoginService,
	logger *zap.Logger,
) *FactoryService {
	return &FactoryService{
		cfg:           cfg,
		db:            db,
		configService: configService,
		loginService:  loginService,
		bravoClient:   bravo.NewClient(30 * time.Second),
		logger:        logger,
	}
}

// GetFactories queries the dynamic list of factories from Bravo ERP
func (s *FactoryService) GetFactories(
	ctx context.Context,
	clientIP, userAgent string,
	req *models.FactoryRequest,
) ([]map[string]interface{}, error) {
	if req == nil {
		req = &models.FactoryRequest{}
	}
	if req.ConfigKey == "" {
		req.ConfigKey = "BravoDefault"
	}
	if req.FiscalYear == "" {
		req.FiscalYear = fmt.Sprintf("%d", time.Now().Year())
	}
	// 1. Resolve Factory Endpoint config dynamically from DB
	factoryEndpointKey := "WorkDocCD_Factory"
	if req.EndpointKey != "" {
		factoryEndpointKey = req.EndpointKey
	} else if req.ApiKey != "" {
		factoryEndpointKey = req.ApiKey
	} else if req.MenuKey != "" {
		factoryEndpointKey = req.MenuKey
	}
	epConfig, err := s.configService.GetEndpointByKey(ctx, factoryEndpointKey, req.ConfigKey)
	if err != nil || epConfig == nil {
		return nil, fmt.Errorf("ERP Endpoint not configured in DB for Factory key: '%s' (ConfigKey: '%s')", factoryEndpointKey, req.ConfigKey)
	}

	endpoint := req.Endpoint
	if endpoint == "" {
		endpoint = epConfig.Endpoint
	}
	if endpoint == "" {
		return nil, fmt.Errorf("ERP Endpoint URL/UUID is empty for Factory key: '%s' in DB", factoryEndpointKey)
	}

	san := epConfig.San
	stn := epConfig.Stn
	alc := epConfig.Alc
	ndcn := epConfig.Ndcn
	nocn := epConfig.Nocn
	necn := epConfig.Necn
	nrcn := epConfig.Nrcn

	erpCfg, err := s.configService.GetConfigByKey(ctx, req.ConfigKey)
	if err != nil {
		return nil, fmt.Errorf("failed to load ERP config '%s': %w", req.ConfigKey, err)
	}

	token, err := s.resolveValidToken(ctx, req.ConfigKey, req.Username, req.Token)
	if err != nil {
		return nil, fmt.Errorf("failed to obtain ERP access token: %w", err)
	}

	branchFilter := "1=1"
	if strings.TrimSpace(req.BranchCode) != "" && !isAllValue(req.BranchCode) {
		branchFilter = fmt.Sprintf("ISNULL(BranchCode,'') IN ('','%s')", strings.TrimSpace(req.BranchCode))
	}

	reqOpts := bravo.RequestOptions{
		BaseURL:            erpCfg.BaseApiUrl,
		Endpoint:           endpoint,
		Token:              token,
		BranchCode:         req.BranchCode,
		FiscalYear:         req.FiscalYear,
		Referer:            erpCfg.Referer,
		ClientIP:           clientIP,
		UserAgent:          userAgent,
		InsecureSkipVerify: erpCfg.InsecureSkipVerify,
	}

	payload := map[string]interface{}{
		"ipo":  false,
		"san":  san,
		"stn":  stn,
		"alc":  alc,
		"ndcn": ndcn,
		"nocn": nocn,
		"necn": necn,
		"nrcn": nrcn,
		"lst":  0,
		"tpid": "ParentId",
		"fcle": []map[string]interface{}{
			{
				"opr": 11,
				"eps": []map[string]interface{}{
					{
						"opr": 11,
						"eps": []map[string]interface{}{
							{"opr": 4, "val": "FactoryName"},
							{"opr": 4, "val": "Id"},
						},
					},
					{"opr": 4, "val": "ParentId"},
				},
			},
		},
		"lps": map[string]interface{}{
			"BRANCHFILTER('BranchCode')": branchFilter,
		},
	}

	respBytes, err := s.bravoClient.DoPost(ctx, reqOpts, payload)
	if err != nil {
		return nil, fmt.Errorf("query factory list from Bravo ERP failed: %w", err)
	}

	rows := bravo.ExtractRows(respBytes)
	return rows, nil
}

func (s *FactoryService) resolveValidToken(ctx context.Context, configKey, username, token string) (string, error) {
	if strings.TrimSpace(token) != "" {
		return strings.TrimSpace(token), nil
	}

	targetUser := username
	if targetUser == "" {
		targetUser = s.cfg.Bravo.DefaultUsername
	}

	if targetUser != "" {
		session, err := s.loginService.GetTokenSession(ctx, configKey, targetUser)
		if err == nil && session != nil && session.AccessToken != "" {
			return session.AccessToken, nil
		}
	}

	return "", fmt.Errorf("active ERP access token/session not found for user '%s'. Please login first", targetUser)
}
