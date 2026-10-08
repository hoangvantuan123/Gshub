#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

mkdir -p logs

echo "========================================================================="
echo "             GSHUB SERVICES - BUILD TOÀN BỘ HỆ THỐNG                     "
echo "========================================================================="

echo -e "\n[1/3] Building Server-Core (:5051)..."
cd "$SCRIPT_DIR/server-core"
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o cmd/server/main.exe ./cmd/server
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o cmd/server/main ./cmd/server
cp -f cmd/server/main.exe "$SCRIPT_DIR/server-core.exe"
cp -f cmd/server/main "$SCRIPT_DIR/server-core"

echo -e "\n[2/3] Building Service-Datahub (:5052)..."
cd "$SCRIPT_DIR/service-datahub"
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o main.exe .
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o main .
cp -f main.exe "$SCRIPT_DIR/service-datahub.exe"
cp -f main "$SCRIPT_DIR/service-datahub"

echo -e "\n[3/3] Building Api-Gateway (:9643)..."
cd "$SCRIPT_DIR/api-gateway"
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o main.exe .
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o main .
cp -f main.exe "$SCRIPT_DIR/api-gateway.exe"
cp -f main "$SCRIPT_DIR/api-gateway"

cd "$SCRIPT_DIR"
echo -e "\n========================================================================="
echo -e " [SUCCESS] BUILD THÀNH CÔNG TOÀN BỘ MICROSERVICES!"
echo -e "========================================================================="
