package perm_scope

import (
	"context"
	"fmt"
	"strings"

	domainRoles "server-core/internal/models/roles"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// PermScopesD - Xóa hàng loạt quy tắc phạm vi quyền hạn (Batch Delete with OCC Check)
func (s *PermScopesService) PermScopesD(ctx context.Context, scopes []domainRoles.ERPPermScopes) (int64, error) {
	if len(scopes) == 0 {
		return 0, nil
	}

	idSeqs := make([]string, 0, len(scopes))
	for _, sc := range scopes {
		if strings.TrimSpace(sc.IdSeq) != "" {
			idSeqs = append(idSeqs, strings.TrimSpace(sc.IdSeq))
		}
	}

	if len(idSeqs) == 0 {
		return 0, fmt.Errorf("IdSeq không được để trống khi xóa")
	}

	// 1. Kiểm tra RowVersion trước khi xóa để chống xóa đè khi có người đang sửa
	type CurrentRecord struct {
		IdSeq      string `db:"IdSeq"`
		RowVersion int64  `db:"RowVersion"`
	}
	var currentList []CurrentRecord
	checkQuery := `SELECT "IdSeq", "RowVersion" FROM "_ERPPermScopes" WHERE "IdSeq" = ANY($1)`
	err := s.db.SelectContext(ctx, &currentList, checkQuery, pq.Array(idSeqs))
	if err != nil {
		return 0, fmt.Errorf("failed to fetch current records before delete: %w", err)
	}

	currentMap := make(map[string]int64, len(currentList))
	for _, cur := range currentList {
		currentMap[cur.IdSeq] = cur.RowVersion
	}

	for _, sc := range scopes {
		dbVer, exists := currentMap[sc.IdSeq]
		if !exists {
			continue // Đã bị xóa trước đó
		}
		if sc.RowVersion != 0 && sc.RowVersion != dbVer {
			return 0, fmt.Errorf("dữ liệu IdSeq %s đã bị thay đổi bởi người khác. Vui lòng tải lại trang!", sc.IdSeq)
		}
	}

	// 2. Thực thi xóa hàng loạt bằng SQL WHERE IN
	deleteQuery := `DELETE FROM "_ERPPermScopes" WHERE "IdSeq" = ANY($1)`
	res, err := s.db.ExecContext(ctx, deleteQuery, pq.Array(idSeqs))
	if err != nil {
		if s.log != nil {
			s.log.Error("[PermScopesD] Delete failed", zap.Error(err))
		}
		return 0, fmt.Errorf("failed to delete perm scopes: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()

	s.totalAllCount.Add(-rowsAffected)
	s.PublishKafkaEvent("PERM_SCOPES_DELETED", idSeqs)

	return rowsAffected, nil
}
