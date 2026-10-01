#!/bin/bash
set -e

echo "=== Building service-datahub for Linux ==="
CGO_ENABLED=0 go build -ldflags="-s -w" -o service-datahub .
chmod +x service-datahub
echo ">>> Build completed successfully!"
echo ">>> To start service with PM2: pm2 start ecosystem.config.js"
