package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port   int
	Prefix string

	HostGRPCUser        string
	HostGRPCBasic       string
	HostGRPCProduce     string
	HostGRPCSearch      string
	HostGRPCHR          string
	HostGRPCLogs        string
	HostGRPCLookup      string
	HostGRPCQC          string
	HostGRPCUpload      string
	HostGRPCAsset       string
	HostGRPCProdControl string
	HostGRPCWarehouse   string
	HostGRPCNotifi      string
	ProtoDir            string

	AllowedOrigins []string
	NodeEnv        string
	LogStorage     string
}

var Cfg *Config

func Load() {
	if err := godotenv.Load(); err != nil {
		log.Println("[config] .env not found, using environment variables")
	}

	port, _ := strconv.Atoi(getEnv("PORT", "8386"))

	Cfg = &Config{
		Port:   port,
		Prefix: "api",

		HostGRPCUser:        getEnv("HOST_GRPC_USER", "127.0.0.1:5051"),
		HostGRPCBasic:       getEnv("HOST_GRPC_BASIC", "127.0.0.1:5052"),
		HostGRPCProduce:     getEnv("HOST_GRPC_PRODUCE", "127.0.0.1:5053"),
		HostGRPCSearch:      getEnv("HOST_GRPC_SEARCH", "127.0.0.1:5054"),
		HostGRPCHR:          getEnv("HOST_GRPC_HR", "127.0.0.1:5055"),
		HostGRPCLogs:        getEnv("HOST_GRPC_LOGS", "127.0.0.1:5056"),
		HostGRPCLookup:      getEnv("HOST_GRPC_LOOKUP", "127.0.0.1:5057"),
		HostGRPCQC:          getEnv("HOST_GRPC_QC", "127.0.0.1:5058"),
		HostGRPCUpload:      getEnv("HOST_GRPC_UPLOAD", "127.0.0.1:5059"),
		HostGRPCAsset:       getEnv("HOST_GRPC_ASSET", "127.0.0.1:5060"),
		HostGRPCProdControl: getEnv("HOST_GRPC_PROD_CONTROL", "127.0.0.1:5061"),
		HostGRPCWarehouse:   getEnv("HOST_GRPC_WAREHOUSE", "127.0.0.1:5061"),
		HostGRPCNotifi:      getEnv("HOST_GRPC_NOTIFI", "127.0.0.1:5062"),
		ProtoDir:            getEnv("PROTO_DIR", "../proto"),

		AllowedOrigins: []string{
			"*",
			"http://localhost:5173",
			"file://",
			"https://erpsheet.vn",
			"https://dev.erpsheet.vn",
			"https://dev-api.erpsheet.vn",
		},
		NodeEnv:    getEnv("NODE_ENV", "dev"),
		LogStorage: getEnv("LOG_STORAGE", "../grafana-logs/logs"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
