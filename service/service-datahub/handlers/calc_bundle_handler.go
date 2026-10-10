package handlers

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	reportModels "service-datahub/models/report"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CalcBundleHandler struct {
	db     *gorm.DB
	logger *zap.Logger
}

func NewCalcBundleHandler(db *gorm.DB, logger *zap.Logger) *CalcBundleHandler {
	return &CalcBundleHandler{
		db:     db,
		logger: logger,
	}
}

// RemoveVietnameseAccents chuyển đổi chuỗi tiếng Việt có dấu thành không dấu tiếng Anh chuẩn
func RemoveVietnameseAccents(str string) string {
	accents := map[rune]string{
		'à': "a", 'á': "a", 'ả': "a", 'ã': "a", 'ạ': "a",
		'ă': "a", 'ằ': "a", 'ắ': "a", 'ẳ': "a", 'ẵ': "a", 'ặ': "a",
		'â': "a", 'ầ': "a", 'ấ': "a", 'ẩ': "a", 'ẫ': "a", 'ậ': "a",
		'đ': "d",
		'è': "e", 'é': "e", 'ẻ': "e", 'ẽ': "e", 'ẹ': "e",
		'ê': "e", 'ề': "e", 'ế': "e", 'ể': "e", 'ễ': "e", 'ệ': "e",
		'ì': "i", 'í': "i", 'ỉ': "i", 'ĩ': "i", 'ị': "i",
		'ò': "o", 'ó': "o", 'ỏ': "o", 'õ': "o", 'ọ': "o",
		'ô': "o", 'ồ': "o", 'ố': "o", 'ổ': "o", 'ỗ': "o", 'ộ': "o",
		'ơ': "o", 'ờ': "o", 'ớ': "o", 'ở': "o", 'ỡ': "o", 'ợ': "o",
		'ù': "u", 'ú': "u", 'ủ': "u", 'ũ': "u", 'ụ': "u",
		'ư': "u", 'ừ': "u", 'ứ': "u", 'ử': "u", 'ữ': "u", 'ự': "u",
		'ỳ': "y", 'ý': "y", 'ỷ': "y", 'ỹ': "y", 'ỵ': "y",
		'À': "A", 'Á': "A", 'Ả': "A", 'Ã': "A", 'Ạ': "A",
		'Ă': "A", 'Ằ': "A", 'Ắ': "A", 'Ẳ': "A", 'Ẵ': "A", 'Ặ': "A",
		'Â': "A", 'Ầ': "A", 'Ấ': "A", 'Ẩ': "A", 'Ẫ': "A", 'Ậ': "A",
		'Đ': "D",
		'È': "E", 'É': "E", 'Ẻ': "E", 'Ẽ': "E", 'Ẹ': "E",
		'Ê': "E", 'Ề': "E", 'Ế': "E", 'Ể': "E", 'Ễ': "E", 'Ệ': "E",
		'Ì': "I", 'Í': "I", 'Ỉ': "I", 'Ĩ': "I", 'Ị': "I",
		'Ò': "O", 'Ó': "O", 'Ỏ': "O", 'Õ': "O", 'Ọ': "O",
		'Ô': "O", 'Ồ': "O", 'Ố': "O", 'Ổ': "O", 'Ỗ': "O", 'Ộ': "O",
		'Ơ': "O", 'Ờ': "O", 'Ớ': "O", 'Ở': "O", 'Ỡ': "O", 'Ợ': "O",
		'Ù': "U", 'Ú': "U", 'Ủ': "U", 'Ũ': "U", 'Ụ': "U",
		'Ư': "U", 'Ừ': "U", 'Ứ': "U", 'Ử': "U", 'Ữ': "U", 'Ự': "U",
		'Ỳ': "Y", 'Ý': "Y", 'Ỷ': "Y", 'Ỹ': "Y", 'Ỵ': "Y",
	}

	var sb strings.Builder
	for _, r := range str {
		if repl, ok := accents[r]; ok {
			sb.WriteString(repl)
		} else {
			sb.WriteRune(r)
		}
	}
	return sb.String()
}

// CleanStorageSlug chuẩn hóa text tiếng Việt thành mã tiếng Anh viết hoa chuẩn ERP (không dấu, không khoảng trắng)
func CleanStorageSlug(input string) string {
	noAccent := RemoveVietnameseAccents(input)
	upper := strings.ToUpper(strings.TrimSpace(noAccent))

	// Chuẩn hóa tên các nhà máy & tổ phổ biến
	if strings.Contains(upper, "TAT CA") || strings.Contains(upper, "ALL") {
		return "TO_ALL"
	}
	if strings.Contains(upper, "HA NOI") || strings.Contains(upper, "HN") {
		if strings.HasPrefix(upper, "GS1") {
			return "GS1_HN"
		}
	}
	if strings.Contains(upper, "QUE VO 1B") || strings.Contains(upper, "QV1B") {
		return "GS5_QV1B"
	}
	if strings.Contains(upper, "QUE VO 2") || strings.Contains(upper, "QV2") {
		return "GS5_QV2"
	}

	// Thay toàn bộ ký tự không phải chữ/số thành dấu gạch dưới
	var sb strings.Builder
	for _, r := range upper {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			sb.WriteRune(r)
		} else {
			sb.WriteRune('_')
		}
	}

	res := sb.String()
	for strings.Contains(res, "__") {
		res = strings.ReplaceAll(res, "__", "_")
	}
	res = strings.Trim(res, "_")
	if res == "" {
		res = "DEFAULT"
	}
	return res
}

// buildBundleStoragePath sinh đường dẫn và tên file chuẩn ERP:
// /ke_hoach_san_xuat/[NhaMay]/[YYYY]/[MM]/[DD]/[ToSX]/KHSX_[NhaMay]_[ToSX]_[YYYYMMDD]_[RegCode]_v[Version].gsprod
func buildBundleStoragePath(factory, team, applyDate, regCode, version string) (fileName string, relPath string, fullPath string) {
	now := time.Now()
	year := fmt.Sprintf("%04d", now.Year())
	month := fmt.Sprintf("%02d", int(now.Month()))
	day := fmt.Sprintf("%02d", now.Day())

	if applyDate != "" {
		cleaned := strings.ReplaceAll(applyDate, "-", "")
		cleaned = strings.ReplaceAll(cleaned, "/", "")
		if len(cleaned) >= 8 {
			year = cleaned[0:4]
			month = cleaned[4:6]
			day = cleaned[6:8]
		}
	}

	factoryClean := CleanStorageSlug(factory)
	teamClean := CleanStorageSlug(team)
	regCodeClean := CleanStorageSlug(regCode)
	dateClean := year + month + day

	if version == "" {
		version = "1.0"
	}
	versionClean := strings.TrimPrefix(version, "v")
	versionClean = strings.TrimPrefix(versionClean, "V")

	// Đọc STORAGE_ROOT_PATH từ biến môi trường .env (mặc định "storage")
	rootPath := os.Getenv("STORAGE_ROOT_PATH")
	if rootPath == "" {
		rootPath = "storage"
	}
	rootPath = filepath.Clean(rootPath)

	fileName = fmt.Sprintf("KHSX_%s_%s_%s_%s_v%s.gsprod", factoryClean, teamClean, dateClean, regCodeClean, versionClean)
	// relPath luôn dùng chuẩn POSIX "/" để lưu vào Database đồng nhất trên mọi OS (Windows / macOS / Linux)
	relPath = fmt.Sprintf("/ke_hoach_san_xuat/%s/%s/%s/%s/%s/%s", factoryClean, year, month, day, teamClean, fileName)
	dirPath := filepath.Join(rootPath, "ke_hoach_san_xuat", factoryClean, year, month, day, teamClean)
	fullPath = filepath.Join(dirPath, fileName)

	return fileName, relPath, fullPath
}

// PublishBundlePayload struct for JSON based publishing
type PublishBundlePayload struct {
	RegCode          string  `json:"reg_code"`
	FactoryName      string  `json:"factory_name"`
	ApplyDate        string  `json:"apply_date"`
	ProductionTeam   string  `json:"production_team"`
	Status           string  `json:"status"`
	Version          string  `json:"version"`
	TotalRows        int     `json:"total_rows"`
	RawSizeMB        float64 `json:"raw_size_mb"`
	CompressedSizeMB float64 `json:"compressed_size_mb"`
	CompressionRatio string  `json:"compression_ratio"`
	BundleBase64     string  `json:"bundle_base64"`
	FileSummaries    string  `json:"file_summaries"`
	CalcSummary      string  `json:"calc_summary"`
	Remark           string  `json:"remark"`
	CreatedBy        string  `json:"created_by"`
}

// PublishBundle handles publishing/uploading a compressed .gsprod bundle
func (h *CalcBundleHandler) PublishBundle(c *gin.Context) {
	contentType := c.ContentType()
	var bundle reportModels.CalcProductionBundle

	if contentType == "application/json" {
		var req PublishBundlePayload
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid payload format: " + err.Error()})
			return
		}

		if req.RegCode == "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Mã đăng ký (reg_code) là bắt buộc"})
			return
		}

		var bundleBytes []byte
		if req.BundleBase64 != "" {
			decoded, err := base64.StdEncoding.DecodeString(req.BundleBase64)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Lỗi giải mã base64 bundle_data: " + err.Error()})
				return
			}
			bundleBytes = decoded
		}

		version := req.Version
		if version == "" {
			version = "1.0"
		}

		status := req.Status
		if status == "" {
			status = "PUBLISHED"
		}

		bundle = reportModels.CalcProductionBundle{
			RegCode:          req.RegCode,
			FactoryName:      req.FactoryName,
			ApplyDate:        req.ApplyDate,
			ProductionTeam:   req.ProductionTeam,
			Status:           status,
			Version:          version,
			TotalRows:        req.TotalRows,
			RawSizeMB:        req.RawSizeMB,
			CompressedSizeMB: req.CompressedSizeMB,
			CompressionRatio: req.CompressionRatio,
			BundleData:       bundleBytes,
			FileSummaries:    req.FileSummaries,
			CalcSummary:      req.CalcSummary,
			Remark:           req.Remark,
			CreatedBy:        req.CreatedBy,
		}
	} else {
		// Multipart Form data
		regCode := c.PostForm("reg_code")
		if regCode == "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Mã đăng ký (reg_code) là bắt buộc"})
			return
		}

		file, err := c.FormFile("bundle_file")
		var bundleBytes []byte
		if err == nil && file != nil {
			f, openErr := file.Open()
			if openErr == nil {
				defer f.Close()
				bundleBytes, _ = io.ReadAll(f)
			}
		}

		totalRows, _ := strconv.Atoi(c.PostForm("total_rows"))
		rawSizeMB, _ := strconv.ParseFloat(c.PostForm("raw_size_mb"), 64)
		compSizeMB, _ := strconv.ParseFloat(c.PostForm("compressed_size_mb"), 64)

		version := c.PostForm("version")
		if version == "" {
			version = "1.0"
		}

		status := c.DefaultPostForm("status", "PUBLISHED")

		bundle = reportModels.CalcProductionBundle{
			RegCode:          regCode,
			FactoryName:      c.DefaultPostForm("factory_name", "GS1 Hà Nội"),
			ApplyDate:        c.PostForm("apply_date"),
			ProductionTeam:   c.DefaultPostForm("production_team", "Tất cả các tổ"),
			Status:           status,
			Version:          version,
			TotalRows:        totalRows,
			RawSizeMB:        rawSizeMB,
			CompressedSizeMB: compSizeMB,
			CompressionRatio: c.PostForm("compression_ratio"),
			BundleData:       bundleBytes,
			FileSummaries:    c.PostForm("file_summaries"),
			CalcSummary:      c.PostForm("calc_summary"),
			Remark:           c.PostForm("remark"),
			CreatedBy:        c.PostForm("created_by"),
		}
	}

	// 1. Sinh tên file & đường dẫn phân cấp theo Năm/Tháng/Ngày
	fileName, relPath, fullPath := buildBundleStoragePath(
		bundle.FactoryName,
		bundle.ProductionTeam,
		bundle.ApplyDate,
		bundle.RegCode,
		bundle.Version,
	)
	bundle.FileName = fileName
	bundle.FilePath = relPath
	bundle.StorageDisk = "local"

	// 2. Lưu file vật lý ra thư mục phân cấp trên Server Disk
	if len(bundle.BundleData) > 0 {
		dir := filepath.Dir(fullPath)
		if err := os.MkdirAll(dir, 0755); err == nil {
			if writeErr := os.WriteFile(fullPath, bundle.BundleData, 0644); writeErr != nil {
				h.logger.Warn("Không thể ghi file ra ổ đĩa", zap.String("path", fullPath), zap.Error(writeErr))
			}
		}
	}

	// 3. Upsert vào PostgreSQL trên cặp khóa (RegCode, Version) để lưu vết lịch sử nhiều version
	err := h.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "RegCode"}, {Name: "Version"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"FileName", "FilePath", "StorageDisk", "FactoryName", "ApplyDate", "ProductionTeam", "Status",
			"TotalRows", "RawSizeMB", "CompressedSizeMB", "CompressionRatio",
			"BundleData", "FileSummaries", "CalcSummary", "Remark", "UpdatedAt",
		}),
	}).Create(&bundle).Error

	if err != nil {
		h.logger.Error("Lỗi lưu gói production bundle lên Server DataHub", zap.Error(err), zap.String("reg_code", bundle.RegCode))
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Không thể lưu gói dữ liệu lên server: " + err.Error()})
		return
	}

	h.logger.Info("Đã công bố và lưu thành công gói production bundle lên Server DataHub",
		zap.String("reg_code", bundle.RegCode),
		zap.String("version", bundle.Version),
		zap.String("file_path", bundle.FilePath),
		zap.Int("bytes", len(bundle.BundleData)),
	)

	c.JSON(http.StatusOK, gin.H{
		"success":            true,
		"message":            "Công bố và lưu trữ gói dữ liệu lên Server DataHub thành công!",
		"reg_code":           bundle.RegCode,
		"version":            bundle.Version,
		"file_name":          bundle.FileName,
		"file_path":          bundle.FilePath,
		"compressed_size_mb": bundle.CompressedSizeMB,
		"compression_ratio":  bundle.CompressionRatio,
	})
}

// QueryBundles lists published bundles without the heavy blob data
func (h *CalcBundleHandler) QueryBundles(c *gin.Context) {
	factory := c.Query("factory_name")
	team := c.Query("production_team")
	applyDateFrom := c.Query("apply_date_from")
	applyDateTo := c.Query("apply_date_to")
	status := c.Query("status")
	keyword := c.Query("keyword")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 500 {
		pageSize = 50
	}

	query := h.db.Model(&reportModels.CalcProductionBundle{}).
		Select("\"Id\", \"RegCode\", \"FactoryName\", \"ApplyDate\", \"ProductionTeam\", \"Status\", \"Version\", \"FileName\", \"FilePath\", \"StorageDisk\", \"TotalRows\", \"RawSizeMB\", \"CompressedSizeMB\", \"CompressionRatio\", \"FileSummaries\", \"CalcSummary\", \"Remark\", \"CreatedBy\", \"CreatedAt\", \"UpdatedAt\"")

	if factory != "" && factory != "Tất cả" {
		query = query.Where("\"FactoryName\" = ?", factory)
	}
	if team != "" && team != "Tất cả" {
		query = query.Where("\"ProductionTeam\" = ?", team)
	}
	if status != "" && status != "Tất cả" {
		query = query.Where("\"Status\" = ?", status)
	}
	if applyDateFrom != "" {
		query = query.Where("\"ApplyDate\" >= ?", applyDateFrom)
	}
	if applyDateTo != "" {
		query = query.Where("\"ApplyDate\" <= ?", applyDateTo)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("(\"RegCode\" ILIKE ? OR \"Remark\" ILIKE ? OR \"CreatedBy\" ILIKE ?)", like, like, like)
	}

	var totalRecords int64
	query.Count(&totalRecords)

	var items []reportModels.CalcProductionBundle
	err := query.Order("\"CreatedAt\" DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&items).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Lỗi truy vấn: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"data":          items,
		"total_records": totalRecords,
		"page":          page,
		"page_size":     pageSize,
	})
}

// DownloadBundle returns the compressed .gsprod binary stream
func (h *CalcBundleHandler) DownloadBundle(c *gin.Context) {
	regCode := c.Param("regCode")
	if regCode == "" {
		regCode = c.Query("reg_code")
	}

	if regCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Mã đăng ký (reg_code) là bắt buộc"})
		return
	}

	version := c.Query("version")
	var bundle reportModels.CalcProductionBundle
	query := h.db.Where("\"RegCode\" = ?", regCode)
	if version != "" {
		query = query.Where("\"Version\" = ?", version)
	} else {
		query = query.Order("\"Version\" DESC, \"CreatedAt\" DESC")
	}

	err := query.First(&bundle).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Không tìm thấy gói dữ liệu cho mã: " + regCode})
		return
	}

	// Nếu bundle_data trong DB bị rỗng, fallback đọc từ file vật lý trên ổ đĩa
	bundleBytes := bundle.BundleData
	if len(bundleBytes) == 0 && bundle.FilePath != "" {
		rootPath := os.Getenv("STORAGE_ROOT_PATH")
		if rootPath == "" {
			rootPath = "storage"
		}
		rootPath = filepath.Clean(rootPath)

		// Chuẩn hóa đường dẫn từ DB sang hệ điều hành hiện tại (Windows / macOS / Linux)
		cleanRel := strings.TrimPrefix(bundle.FilePath, "/")
		cleanRel = strings.TrimPrefix(cleanRel, "\\")
		diskPath := filepath.Join(rootPath, filepath.FromSlash(cleanRel))

		if data, readErr := os.ReadFile(diskPath); readErr == nil && len(data) > 0 {
			bundleBytes = data
		}
	}

	if len(bundleBytes) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Gói dữ liệu rỗng"})
		return
	}

	filename := bundle.FileName
	if filename == "" {
		filename = bundle.RegCode + "_v" + bundle.Version + ".gsprod"
	}

	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Length", strconv.Itoa(len(bundleBytes)))
	c.Header("X-Bundle-Version", bundle.Version)
	c.Header("X-Bundle-Rows", strconv.Itoa(bundle.TotalRows))
	c.Header("X-Bundle-Filepath", bundle.FilePath)
	c.Header("Cache-Control", "public, max-age=3600")

	c.Data(http.StatusOK, "application/octet-stream", bundleBytes)
}

// DeleteBundle deletes a bundle by reg_code
func (h *CalcBundleHandler) DeleteBundle(c *gin.Context) {
	regCode := c.Param("regCode")
	if regCode == "" {
		regCode = c.Query("reg_code")
	}

	if regCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Mã đăng ký (reg_code) là bắt buộc"})
		return
	}

	result := h.db.Where("\"RegCode\" = ?", regCode).Delete(&reportModels.CalcProductionBundle{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Lỗi xóa gói dữ liệu: " + result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "Đã xóa gói dữ liệu thành công",
		"deleted_rows": result.RowsAffected,
	})
}
