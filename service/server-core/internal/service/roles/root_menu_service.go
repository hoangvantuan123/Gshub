package roles

import (
	"server-core/internal/config"
	"server-core/internal/service/roles/root_menu"

	"github.com/jmoiron/sqlx"
)

// Khai báo các hằng số cấu hình giới hạn dòng để dễ dàng theo dõi và điều chỉnh
const (
	DefaultRootMenuQueryLimit = config.DefaultQueryLimit    // Mặc định Query tải 3000 dòng
	MaxRootMenuQueryLimit     = config.DefaultMaxQueryLimit // Giới hạn trần Query tối đa 10000 dòng
	MaxRootMenuBatchSaveLimit = config.DefaultMaxBatchLimit // Giới hạn Thêm / Sửa / Xóa tối đa 3000 dòng/lần
)

// RootMenusService is an alias to root_menu.RootMenusService
type RootMenusService = root_menu.RootMenusService

// NewRootMenusService initializes and returns the RootMenusService from the root_menu module
func NewRootMenusService(db *sqlx.DB) *RootMenusService {
	return root_menu.NewRootMenusService(db)
}
