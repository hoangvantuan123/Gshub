package roles

import (
	"server-core/internal/config"
	"server-core/internal/service/roles/menu"

	"github.com/jmoiron/sqlx"
)

// Khai báo các hằng số cấu hình giới hạn dòng để dễ dàng theo dõi và điều chỉnh
const (
	DefaultMenuQueryLimit = config.DefaultQueryLimit    // Mặc định Query tải 3000 dòng
	MaxMenuQueryLimit     = config.DefaultMaxQueryLimit // Giới hạn trần Query tối đa 10000 dòng
	MaxMenuBatchSaveLimit = config.DefaultMaxBatchLimit // Giới hạn Thêm / Sửa / Xóa tối đa 3000 dòng/lần
)

// MenusService is an alias to menu.MenusService
type MenusService = menu.MenusService

// NewMenusService initializes and returns the MenusService from the menu module
func NewMenusService(db *sqlx.DB) *MenusService {
	return menu.NewMenusService(db)
}
