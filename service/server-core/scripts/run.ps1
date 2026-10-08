# Scripts to run the Go User Microservice

Write-Host "Checking dependencies..." -ForegroundColor Cyan

# Install dependencies if go.sum doesn't exist or just tidy up
go mod tidy

Write-Host "Starting User Microservice..." -ForegroundColor Green
go run cmd/server/main.go
