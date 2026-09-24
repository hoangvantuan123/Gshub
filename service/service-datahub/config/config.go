package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	DB       DBConfig
	Bravo    BravoConfig
	JWT      JWTConfig
}

type ServerConfig struct {
	Port string
	Env  string
}

type DBConfig struct {
	Host               string
	Port               int
	User               string
	Password           string
	DBName             string
	SSLMode            string
	MaxOpenConns       int
	MaxIdleConns       int
	ConnMaxLifetimeMin int
}

func (d DBConfig) DSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.DBName, d.SSLMode)
}

type BravoConfig struct {
	AuthURL             string
	BaseAPIURL          string
	Referer             string
	ClientID            string
	ClientSecret        string
	DeviceCode          string
	ConnectionName      string
	GrantType           string
	Scope               string
	DefaultUsername     string
	DefaultPassword     string
	InsecureSkipVerify  bool
}

type JWTConfig struct {
	Secret      string
	ExpireHours int
}

func LoadConfig() (*Config, error) {
	// Try loading from .env if present
	_ = godotenv.Load(".env", "service-datahub/.env", "../.env")

	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	dbMaxOpen, _ := strconv.Atoi(getEnv("DB_MAX_OPEN_CONNS", "50"))
	dbMaxIdle, _ := strconv.Atoi(getEnv("DB_MAX_IDLE_CONNS", "10"))
	dbLifetime, _ := strconv.Atoi(getEnv("DB_CONN_MAX_LIFETIME_MINUTES", "30"))
	jwtExpire, _ := strconv.Atoi(getEnv("JWT_EXPIRE_HOURS", "72"))
	bravoInsecure, _ := strconv.ParseBool(getEnv("BRAVO_INSECURE_SKIP_VERIFY", "true"))

	cfg := &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
			Env:  getEnv("APP_ENV", "development"),
		},
		DB: DBConfig{
			Host:               getEnv("DB_HOST", "127.0.0.1"),
			Port:               dbPort,
			User:               getEnv("DB_USER", "postgres"),
			Password:           getEnv("DB_PASSWORD", "postgres"),
			DBName:             getEnv("DB_NAME", "datahub_db"),
			SSLMode:            getEnv("DB_SSLMODE", "disable"),
			MaxOpenConns:       dbMaxOpen,
			MaxIdleConns:       dbMaxIdle,
			ConnMaxLifetimeMin: dbLifetime,
		},
		Bravo: BravoConfig{
			AuthURL:            getEnv("BRAVO_AUTH_URL", "https://bravo.goldsunpackaging.vn:5051/fa837234b0b27bc02365a940995bdc24"),
			BaseAPIURL:         getEnv("BRAVO_BASE_API_URL", "https://bravo.goldsunpackaging.vn:5051"),
			Referer:            getEnv("BRAVO_REFERER", "https://bravo.goldsunpackaging.vn:5052/"),
			ClientID:           getEnv("BRAVO_CLIENT_ID", "c52bd596-07ff-4329-a640-67f41a51a90e"),
			ClientSecret:       getEnv("BRAVO_CLIENT_SECRET", "DC86276E4BF54018BE9EC05650681914"),
			DeviceCode:         getEnv("BRAVO_DEVICE_CODE", "45fd8c9a3974fe45589811c5dfbc2fef"),
			ConnectionName:     getEnv("BRAVO_CONNECTION_NAME", "Default"),
			GrantType:          getEnv("BRAVO_GRANT_TYPE", "password"),
			Scope:              getEnv("BRAVO_SCOPE", "ApiGateway offline_access"),
			DefaultUsername:    getEnv("BRAVO_DEFAULT_USERNAME", "IT_TUANHV"),
			DefaultPassword:    getEnv("BRAVO_DEFAULT_PASSWORD", "Tuan3112@"),
			InsecureSkipVerify: bravoInsecure,
		},
		JWT: JWTConfig{
			Secret:      getEnv("JWT_SECRET", "syscore_datahub_super_secret_jwt_key_2026"),
			ExpireHours: jwtExpire,
		},
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}
