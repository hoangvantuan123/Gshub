package config

import (
	"os"
	"strconv"
	"strings"
	"sync"

	"server-core/internal/constants"
)

// ============================================================================
// HỆ THỐNG CẤU HÌNH GIỚI HẠN AUD (ADD / UPDATE / DELETE / QUERY) THEO TỪNG TRANG
// Đồng bộ 1:1 và mở rộng đầy đủ theo cấu hình audConfig.js trên Frontend ERP
// ============================================================================

const (
	// DefaultMaxBatchLimit là giới hạn mặc định cho 1 lần Thêm / Sửa / Xóa (3.000 dòng)
	DefaultMaxBatchLimit = 3000

	// DefaultMaxQueryLimit là giới hạn tối đa cho 1 lần truy vấn dữ liệu (10.000 dòng)
	DefaultMaxQueryLimit = 10000

	// DefaultQueryLimit là số dòng trả về mặc định nếu không truyền Limit (3.000 dòng)
	DefaultQueryLimit = 3000

	// DefaultPageSize là số lượng bản ghi cho mỗi trang khi phân trang (1.500 dòng)
	DefaultPageSize = 1500

	// DefaultPage là số trang mặc định
	DefaultPage = 1
)

// PageLimitConfig chứa toàn bộ cấu hình giới hạn số lượng dòng cho 1 trang/thực thể cụ thể
type PageLimitConfig struct {
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
	Limit    int `json:"limit"`
	Query    int `json:"query"`
	Save     int `json:"save"`
	Add      int `json:"add"`
	Update   int `json:"update"`
	Delete   int `json:"delete"`
}

var (
	limitsMu sync.RWMutex

	// defaultPageConfig là cấu hình chuẩn khi một trang chưa định nghĩa riêng
	defaultPageConfig = PageLimitConfig{
		Page:     DefaultPage,
		PageSize: DefaultPageSize,
		Limit:    DefaultPageSize,
		Query:    DefaultQueryLimit,
		Save:     DefaultMaxBatchLimit,
		Add:      DefaultMaxBatchLimit,
		Update:   DefaultMaxBatchLimit,
		Delete:   DefaultMaxBatchLimit,
	}

	// AUD_MENU_LIMITS lưu trữ bảng cấu hình chi tiết theo từng Trang / Module / Entity
	// Giúp quản lý cấu hình số lượng khác nhau cho từng trang một cách trực quan và dễ dàng mở rộng
	AUD_MENU_LIMITS = map[string]PageLimitConfig{
		"DEFAULT": defaultPageConfig,

		// Trang Root Menu (Module lớn)
		"ROOT_MENU": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"PAGE_ROOT_MENU": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"TECH_ROOT": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},

		// Trang Menu Chi Tiết
		"MENU": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"MENU_TECHNIQUE": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"PAGE_MENU": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"TECH_MENU_ITEMS": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},

		// Trang Phân Quyền Hệ Thống & Quản Lý Nhóm Quyền
		"ROLE_MANAGEMENT": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"ROLE_GROUP": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"ROLE_USER": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"ACTION_PERM": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},

		// Quản Lý Người Dùng
		"USER_MANAGEMENT": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"USER": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},

		// Quản Lý Bảng Dữ Liệu Kỹ Thuật (Technique)
		"TECHNIQUE": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"TBL_GRP": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"TBL_GRP_ITEM": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"TBL_GRP_PERM": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},

		// Đa Ngôn Ngữ & Từ Điển Hệ Thống
		"DICT_SYS": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"DICTIONARY": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
		"LANGUAGE": {
			Page: 1, PageSize: 1500, Limit: 1500, Query: 3000, Save: 3000, Add: 3000, Update: 3000, Delete: 3000,
		},
	}
)

// normalizeKey chuẩn hóa chuỗi key để tra cứu không phân biệt hoa thường
func normalizeKey(key string) string {
	return strings.ToUpper(strings.TrimSpace(key))
}

// GetPageLimitConfig lấy cấu hình số lượng dòng chi tiết của một trang/entity cụ thể
func GetPageLimitConfig(pageKey string) PageLimitConfig {
	limitsMu.RLock()
	defer limitsMu.RUnlock()

	key := normalizeKey(pageKey)
	if cfg, exists := AUD_MENU_LIMITS[key]; exists {
		return cfg
	}
	return defaultPageConfig
}

// SetPageLimitConfig cho phép thay đổi hoặc đăng ký cấu hình riêng cho từng trang trong runtime
func SetPageLimitConfig(pageKey string, cfg PageLimitConfig) {
	if pageKey == "" {
		return
	}
	limitsMu.Lock()
	defer limitsMu.Unlock()
	AUD_MENU_LIMITS[normalizeKey(pageKey)] = cfg
}

// GetAudLimit lấy giới hạn số dòng theo từng trang và từng loại thao tác (ADD, UPDATE, DELETE, SAVE, QUERY, PAGE_SIZE)
func GetAudLimit(pageKey string, actionType ...string) int {
	cfg := GetPageLimitConfig(pageKey)

	action := "SAVE"
	if len(actionType) > 0 && actionType[0] != "" {
		action = strings.ToUpper(strings.TrimSpace(actionType[0]))
	}

	switch action {
	case "A", "ADD", "THÊM", "THEM", "THÊM MỚI":
		if cfg.Add > 0 {
			return cfg.Add
		}
	case "U", "UPDATE", "CẬP NHẬT", "CAP NHAT", "SỬA":
		if cfg.Update > 0 {
			return cfg.Update
		}
	case "D", "DELETE", "XÓA", "XOA":
		if cfg.Delete > 0 {
			return cfg.Delete
		}
	case "SAVE", "LƯU":
		if cfg.Save > 0 {
			return cfg.Save
		}
	case "Q", "QUERY", "SEARCH", "TRUY VẤN", "TIM KIEM":
		if cfg.Query > 0 {
			return cfg.Query
		}
	case "PAGE_SIZE", "PAGESIZE", "LIMIT":
		if cfg.PageSize > 0 {
			return cfg.PageSize
		}
		if cfg.Limit > 0 {
			return cfg.Limit
		}
	case "PAGE":
		if cfg.Page > 0 {
			return cfg.Page
		}
	}

	// Fallback về giá trị Save hoặc biến môi trường
	if cfg.Save > 0 {
		return cfg.Save
	}

	if val := os.Getenv("AUD_MAX_BATCH_LIMIT"); val != "" {
		if limit, err := strconv.Atoi(val); err == nil && limit > 0 {
			return limit
		}
	}

	return DefaultMaxBatchLimit
}

// GetMaxBatchLimit trả về giới hạn số dòng tối đa cho 1 batch của trang/thực thể tương ứng
func GetMaxBatchLimit(pageKey ...string) int {
	key := "DEFAULT"
	if len(pageKey) > 0 && pageKey[0] != "" {
		key = pageKey[0]
	}
	return GetAudLimit(key, "SAVE")
}

// GetMaxQueryLimit trả về giới hạn trần truy vấn tối đa
func GetMaxQueryLimit(pageKey ...string) int {
	key := "DEFAULT"
	if len(pageKey) > 0 && pageKey[0] != "" {
		key = pageKey[0]
	}
	queryLimit := GetAudLimit(key, "QUERY")
	if queryLimit > DefaultMaxQueryLimit {
		return queryLimit
	}
	if val := os.Getenv("AUD_MAX_QUERY_LIMIT"); val != "" {
		if limit, err := strconv.Atoi(val); err == nil && limit > 0 {
			return limit
		}
	}
	return DefaultMaxQueryLimit
}

// GetDefaultQueryLimit trả về giới hạn mặc định khi truy vấn của trang tương ứng
func GetDefaultQueryLimit(pageKey ...string) int {
	key := "DEFAULT"
	if len(pageKey) > 0 && pageKey[0] != "" {
		key = pageKey[0]
	}
	return GetAudLimit(key, "QUERY")
}

// GetDefaultPageSize trả về kích thước trang chuẩn của trang tương ứng
func GetDefaultPageSize(pageKey ...string) int {
	key := "DEFAULT"
	if len(pageKey) > 0 && pageKey[0] != "" {
		key = pageKey[0]
	}
	return GetAudLimit(key, "PAGE_SIZE")
}

// ValidateBatchLimit kiểm tra số lượng dòng gửi lên có vượt ngưỡng cho phép của từng trang và từng thao tác hay không
func ValidateBatchLimit(count int, action string, pageKey ...string) error {
	if count <= 0 {
		return nil
	}

	key := "DEFAULT"
	if len(pageKey) > 0 && pageKey[0] != "" {
		key = pageKey[0]
	}

	limit := GetAudLimit(key, action)
	if count > limit {
		actionDesc := action
		if actionDesc == "" {
			actionDesc = "thao tác"
		}
		return constants.NewError(
			constants.CodeRateLimitExceeded,
			"Số lượng dòng %s vượt quá giới hạn tối đa %d dòng/lần của trang [%s] (gửi lên %d dòng)",
			actionDesc,
			limit,
			key,
			count,
		)
	}
	return nil
}
