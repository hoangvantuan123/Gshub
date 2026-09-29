package config

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	LogStorage       string
	Env              string
	ServiceName      string
	PortGrpc         int
	PostgresHost     string
	PostgresPort     int
	PostgresUser     string
	PostgresPass     string
	PostgresDB       string
	PostgresDBLogs   string
	JwtSecret        string
	PostgresMaxConns int
	PostgresMinConns int
	KafkaBrokers     string
	KafkaTopicApi    string
	KafkaTopicData   string
	KafkaTopicLogin  string
}

var Cfg Config

func Load() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	env := getEnv("NODE_ENV", "dev")

	jwtSecret := strings.Trim(strings.TrimSpace(getEnv("JWT_SECRET", "")), "'\"")
	if jwtSecret == "" {
		jwtSecret = "P@5sW0rD!$R3c3nT@2024"
		log.Println("JWT_SECRET not configured in .env. Using standard default key.")
	}

	Cfg = Config{
		LogStorage:       getEnv("LOG_STORAGE", "/Users/hoangvantuan/Documents/erpsys/service/grafana-logs/logs"),
		Env:              env,
		ServiceName:      getEnv("SERVICE_NAME", "microservice-user"),
		PortGrpc:         getEnvAsInt("PORT_GRPC", 5051),
		PostgresHost:     getEnv("POSTGRES_HOST", "localhost"),
		PostgresPort:     getEnvAsInt("POSTGRES_PORT", 5432),
		PostgresUser:     getEnv("POSTGRES_USER", "postgres"),
		PostgresPass:     getEnv("POSTGRES_PASSWORD", "AdminErp#"),
		PostgresDB:       getEnv("POSTGRES_DB", "ERPSYS"),
		PostgresDBLogs:   getEnv("POSTGRES_DB_LOGS", "ERPSYSLOG"),
		JwtSecret:        jwtSecret,
		PostgresMaxConns: getEnvAsInt("POSTGRES_MAX_CONNS", 0), // 0: Tự động dò max_connections của Postgres
		PostgresMinConns: getEnvAsInt("POSTGRES_MIN_CONNS", 0), // 0: Tự động tính toán min connections tối ưu
		KafkaBrokers:     getEnv("KAFKA_BROKERS", "localhost:9092"),
		KafkaTopicApi:    getEnv("KAFKA_TOPIC_API", "erp.audit.api"),
		KafkaTopicData:   getEnv("KAFKA_TOPIC_DATA", "erp.audit.datachange"),
		KafkaTopicLogin:  getEnv("KAFKA_TOPIC_LOGIN", "erp.audit.login"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvAsInt(key string, fallback int) int {
	strValue := getEnv(key, "")
	if value, err := strconv.Atoi(strValue); err == nil {
		return value
	}
	return fallback
}

func getEnvAsBool(key string, fallback bool) bool {
	strValue := getEnv(key, "")
	if strValue != "" {
		val := strings.ToLower(strValue)
		return val == "true" || val == "1" || val == "yes"
	}
	return fallback
}

func generateRandomSecret(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "P@5sW0rD!$R3c3nT@2024"
	}
	return hex.EncodeToString(bytes)
}
