BINARY_NAME=server-core
MAIN_PATH=./cmd/server/main.go
OUTPUT_DIR=./bin

.PHONY: all gen build-win build-linux build-mac clean

all: gen build-win build-linux build-mac

gen:
	@echo "--- Generating Proto files... ---"
	go generate ./...

build-win:
	@echo "--- Building for Windows... ---"
	@if not exist "$(OUTPUT_DIR)" mkdir "$(OUTPUT_DIR)"
	set GOOS=windows&& set GOARCH=amd64&& go build -o $(OUTPUT_DIR)/$(BINARY_NAME)-win.exe $(MAIN_PATH)

build-linux:
	@echo "--- Building for Linux... ---"
	@if not exist "$(OUTPUT_DIR)" mkdir "$(OUTPUT_DIR)"
	set GOOS=linux&& set GOARCH=amd64&& go build -o $(OUTPUT_DIR)/$(BINARY_NAME)-linux $(MAIN_PATH)

build-mac:
	@echo "--- Building for macOS... ---"
	@if not exist "$(OUTPUT_DIR)" mkdir "$(OUTPUT_DIR)"
	set GOOS=darwin&& set GOARCH=amd64&& go build -o $(OUTPUT_DIR)/$(BINARY_NAME)-mac $(MAIN_PATH)

clean:
	@echo "--- Cleaning up... ---"
	@if exist "$(OUTPUT_DIR)" rmdir /s /q "$(OUTPUT_DIR)"
