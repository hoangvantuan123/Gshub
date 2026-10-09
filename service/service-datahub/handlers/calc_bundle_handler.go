package handlers

import (
	"encoding/base64"
	"io"
	"net/http"
	"strconv"

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

		bundle = reportModels.CalcProductionBundle{
			RegCode:          req.RegCode,
			FactoryName:      req.FactoryName,
			ApplyDate:        req.ApplyDate,
			ProductionTeam:   req.ProductionTeam,
			Status:           "PUBLISHED",
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

		bundle = reportModels.CalcProductionBundle{
			RegCode:          regCode,
			FactoryName:      c.DefaultPostForm("factory_name", "GS1 Hà Nội"),
			ApplyDate:        c.PostForm("apply_date"),
			ProductionTeam:   c.DefaultPostForm("production_team", "Tất cả các tổ"),
			Status:           "PUBLISHED",
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

	// Upsert on reg_code
	err := h.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "reg_code"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"factory_name", "apply_date", "production_team", "status", "version",
			"total_rows", "raw_size_mb", "compressed_size_mb", "compression_ratio",
			"bundle_data", "file_summaries", "calc_summary", "remark", "updated_at",
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
		zap.Int("bytes", len(bundle.BundleData)),
	)

	c.JSON(http.StatusOK, gin.H{
		"success":            true,
		"message":            "Công bố và lưu trữ gói dữ liệu lên Server DataHub thành công!",
		"reg_code":           bundle.RegCode,
		"version":            bundle.Version,
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
		Select("id, reg_code, factory_name, apply_date, production_team, status, version, total_rows, raw_size_mb, compressed_size_mb, compression_ratio, file_summaries, calc_summary, remark, created_by, created_at, updated_at")

	if factory != "" && factory != "Tất cả" {
		query = query.Where("factory_name = ?", factory)
	}
	if team != "" && team != "Tất cả" {
		query = query.Where("production_team = ?", team)
	}
	if status != "" && status != "Tất cả" {
		query = query.Where("status = ?", status)
	}
	if applyDateFrom != "" {
		query = query.Where("apply_date >= ?", applyDateFrom)
	}
	if applyDateTo != "" {
		query = query.Where("apply_date <= ?", applyDateTo)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("(reg_code ILIKE ? OR remark ILIKE ? OR created_by ILIKE ?)", like, like, like)
	}

	var totalRecords int64
	query.Count(&totalRecords)

	var items []reportModels.CalcProductionBundle
	err := query.Order("created_at DESC").
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

	var bundle reportModels.CalcProductionBundle
	err := h.db.Where("reg_code = ?", regCode).First(&bundle).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Không tìm thấy gói dữ liệu cho mã: " + regCode})
		return
	}

	if len(bundle.BundleData) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Gói dữ liệu rỗng"})
		return
	}

	filename := bundle.RegCode + "_v" + bundle.Version + ".gsprod"
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Length", strconv.Itoa(len(bundle.BundleData)))
	c.Header("X-Bundle-Version", bundle.Version)
	c.Header("X-Bundle-Rows", strconv.Itoa(bundle.TotalRows))
	c.Header("Cache-Control", "public, max-age=3600")

	c.Data(http.StatusOK, "application/octet-stream", bundle.BundleData)
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

	result := h.db.Where("reg_code = ?", regCode).Delete(&reportModels.CalcProductionBundle{})
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
