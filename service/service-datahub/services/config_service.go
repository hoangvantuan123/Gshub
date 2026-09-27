package services

import (
	"context"
	"errors"
	"time"

	"service-datahub/config"
	"service-datahub/models"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

type ConfigService struct {
	cfg    *config.Config
	db     *gorm.DB
	logger *zap.Logger
}

func NewConfigService(cfg *config.Config, db *gorm.DB, logger *zap.Logger) *ConfigService {
	return &ConfigService{
		cfg:    cfg,
		db:     db,
		logger: logger,
	}
}

// GetAllConfigs returns all system ERP configurations
func (s *ConfigService) GetAllConfigs(ctx context.Context) ([]models.ErpConfig, error) {
	var list []models.ErpConfig
	err := s.db.WithContext(ctx).Order("\"CreatedAt\" DESC").Find(&list).Error
	if err == nil && len(list) == 0 {
		// Auto-seed BravoDefault if table is empty
		defaultCfg, _ := s.GetConfigByKey(ctx, "BravoDefault")
		if defaultCfg != nil {
			list = append(list, *defaultCfg)
		}
	}
	return list, err
}

// GetConfigByKey returns a specific configuration by key (auto provisions default if missing)
func (s *ConfigService) GetConfigByKey(ctx context.Context, configKey string) (*models.ErpConfig, error) {
	if configKey == "" {
		configKey = "BravoDefault"
	}

	var cfg models.ErpConfig
	err := s.db.WithContext(ctx).Where("\"ConfigKey\" = ?", configKey).First(&cfg).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Auto provision BravoDefault or Bravo_PROD on the fly
			if (configKey == "BravoDefault" || configKey == "Bravo_PROD") && s.cfg != nil {
				defaultConfig := models.ErpConfig{
					ConfigKey:          configKey,
					ConfigName:         "Bravo ERP Goldsun",
					Provider:           "Bravo",
					AuthUrl:            s.cfg.Bravo.AuthURL,
					BaseApiUrl:         s.cfg.Bravo.BaseAPIURL,
					Referer:            s.cfg.Bravo.Referer,
					ClientId:           s.cfg.Bravo.ClientID,
					ClientSecret:       s.cfg.Bravo.ClientSecret,
					DeviceCode:         s.cfg.Bravo.DeviceCode,
					ConnectionName:     s.cfg.Bravo.ConnectionName,
					GrantType:          s.cfg.Bravo.GrantType,
					Scope:              s.cfg.Bravo.Scope,
					InsecureSkipVerify: s.cfg.Bravo.InsecureSkipVerify,
					ExtraParams:        "{}",
					IsActive:           true,
					CreatedAt:          time.Now(),
					UpdatedAt:          time.Now(),
				}

				if createErr := s.db.WithContext(ctx).Create(&defaultConfig).Error; createErr == nil {
					s.logger.Info("Auto-created missing ERP configuration in DATAHUB DB", zap.String("config_key", configKey))
					return &defaultConfig, nil
				}
			}

			return nil, errors.New("ERP configuration not found for key: " + configKey)
		}
		return nil, err
	}

	return &cfg, nil
}

// SaveConfig creates or updates an ERP configuration
func (s *ConfigService) SaveConfig(ctx context.Context, cfg *models.ErpConfig) error {
	if cfg.ConfigKey == "" {
		return errors.New("ConfigKey is required")
	}
	if cfg.AuthUrl == "" {
		return errors.New("AuthUrl is required")
	}

	cfg.UpdatedAt = time.Now()
	var existing models.ErpConfig
	err := s.db.WithContext(ctx).Where("\"ConfigKey\" = ?", cfg.ConfigKey).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if cfg.CreatedAt.IsZero() {
				cfg.CreatedAt = time.Now()
			}
			return s.db.WithContext(ctx).Create(cfg).Error
		}
		return err
	}

	return s.db.WithContext(ctx).Model(&existing).Updates(map[string]interface{}{
		"ConfigName":         cfg.ConfigName,
		"Provider":           cfg.Provider,
		"AuthUrl":            cfg.AuthUrl,
		"BaseApiUrl":         cfg.BaseApiUrl,
		"Referer":            cfg.Referer,
		"ClientId":           cfg.ClientId,
		"ClientSecret":       cfg.ClientSecret,
		"DeviceCode":         cfg.DeviceCode,
		"ConnectionName":     cfg.ConnectionName,
		"GrantType":          cfg.GrantType,
		"Scope":              cfg.Scope,
		"InsecureSkipVerify": cfg.InsecureSkipVerify,
		"ExtraParams":        cfg.ExtraParams,
		"IsActive":           cfg.IsActive,
		"UpdatedAt":          time.Now(),
	}).Error
}

// DeleteConfig removes a configuration
func (s *ConfigService) DeleteConfig(ctx context.Context, configKey string) error {
	return s.db.WithContext(ctx).Where("\"ConfigKey\" = ?", configKey).Delete(&models.ErpConfig{}).Error
}

// GetEndpointByKey returns a dynamic ERP endpoint record by key from DB
func (s *ConfigService) GetEndpointByKey(ctx context.Context, endpointKey, configKey string) (*models.ErpEndpoint, error) {
	if configKey == "" {
		configKey = "BravoDefault"
	}
	var ep models.ErpEndpoint
	err := s.db.WithContext(ctx).Where("\"EndpointKey\" = ? AND \"ConfigKey\" = ? AND \"IsActive\" = true", endpointKey, configKey).First(&ep).Error
	if err != nil {
		// Fallback without configKey check
		err = s.db.WithContext(ctx).Where("\"EndpointKey\" = ? AND \"IsActive\" = true", endpointKey).First(&ep).Error
		if err != nil {
			return nil, err
		}
	}
	return &ep, nil
}

// GetAllEndpoints returns all registered endpoints
func (s *ConfigService) GetAllEndpoints(ctx context.Context, configKey string) ([]models.ErpEndpoint, error) {
	var list []models.ErpEndpoint
	query := s.db.WithContext(ctx).Order("\"CreatedAt\" ASC")
	if configKey != "" {
		query = query.Where("\"ConfigKey\" = ?", configKey)
	}
	err := query.Find(&list).Error
	return list, err
}

// SaveEndpoint creates or updates an ERP endpoint record
func (s *ConfigService) SaveEndpoint(ctx context.Context, ep *models.ErpEndpoint) error {
	if ep.EndpointKey == "" {
		return errors.New("EndpointKey is required")
	}
	if ep.Endpoint == "" {
		return errors.New("Endpoint is required")
	}

	ep.UpdatedAt = time.Now()
	var existing models.ErpEndpoint
	err := s.db.WithContext(ctx).Where("\"EndpointKey\" = ?", ep.EndpointKey).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if ep.CreatedAt.IsZero() {
				ep.CreatedAt = time.Now()
			}
			return s.db.WithContext(ctx).Create(ep).Error
		}
		return err
	}

	return s.db.WithContext(ctx).Model(&existing).Updates(map[string]interface{}{
		"ConfigKey":   ep.ConfigKey,
		"Endpoint":    ep.Endpoint,
		"Stn":         ep.Stn,
		"San":         ep.San,
		"Alc":         ep.Alc,
		"Ndcn":        ep.Ndcn,
		"Nocn":        ep.Nocn,
		"Necn":        ep.Necn,
		"Nrcn":        ep.Nrcn,
		"Fields":      ep.Fields,
		"Description": ep.Description,
		"IsActive":    ep.IsActive,
		"UpdatedAt":   time.Now(),
	}).Error
}
