#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

mkdir -p logs

echo "========================================================================="
echo "             GSHUB SERVICES - BUILD TOÀN BỘ HỆ THỐNG                     "
echo "========================================================================="

echo -e "\n[1/3] Building Server-Core (:60051)..."
cd "$SCRIPT_DIR/server-core"
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o cmd/server/main.exe ./cmd/server
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o cmd/server/main ./cmd/server
chmod +x cmd/server/main
cp -f cmd/server/main.exe "$SCRIPT_DIR/server-core.exe" 2>/dev/null || true

echo -e "\n[2/3] Building Service-Datahub (:60052)..."
cd "$SCRIPT_DIR/service-datahub"
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o main.exe .
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o main .
chmod +x main
cp -f main.exe "$SCRIPT_DIR/service-datahub.exe" 2>/dev/null || true

echo -e "\n[3/3] Building Api-Gateway (:9643)..."
cd "$SCRIPT_DIR/api-gateway"
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o main.exe .
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o main .
chmod +x main
cp -f main.exe "$SCRIPT_DIR/api-gateway.exe" 2>/dev/null || true

cd "$SCRIPT_DIR"
echo -e "\n========================================================================="
echo -e " [SUCCESS] BUILD THÀNH CÔNG TOÀN BỘ MICROSERVICES!"
echo -e "========================================================================="
