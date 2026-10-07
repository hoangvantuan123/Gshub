package action

import (
	"context"
	"fmt"
	"math"
	"strings"

	"go.uber.org/zap"
)

type ActionQueryResult struct {
	List         []ActionItem
	Page         int
	PageSize     int
	TotalRows    int
	Total        int
	TotalPages   int
	TotalAll     int
	LoadedCount  int
	TotalColumns int
}

func (s *ActionService) QueryActions(ctx context.Context, keyword string, page int, pageSize int) (*ActionQueryResult, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 1000
	}

	where := "1=1"
	var args []interface{}
	idx := 1

	if strings.TrimSpace(keyword) != "" {
		k := "%" + strings.ToLower(strings.TrimSpace(keyword)) + "%"
		where += fmt.Sprintf(` AND (LOWER("ActionKey") LIKE $%d OR LOWER("ActionName") LIKE $%d OR LOWER(COALESCE("Description", '')) LIKE $%d)`, idx, idx, idx)
		args = append(args, k)
		idx++
	}

	// 1. Total All
	var totalAll int
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM "_ERPActions"`).Scan(&totalAll)

	// 2. Total Filtered
	var totalFiltered int
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM "_ERPActions" WHERE %s`, where)
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalFiltered); err != nil {
		s.logger.Error("QueryActions count error", zap.Error(err))
		return nil, err
	}

	// 3. Query list
	offset := (page - 1) * pageSize
	query := fmt.Sprintf(`
		SELECT 
			COALESCE("Id"::text, ''),
			COALESCE("ActionKey", ''),
			COALESCE("ActionName", ''),
			COALESCE("Description", ''),
			COALESCE("Icon", 'Activity'),
			COALESCE("IdxNo", 1),
			COALESCE("Active", true),
			COALESCE("CreatedBy", ''),
			COALESCE(TO_CHAR("CreatedAt", 'YYYY-MM-DD HH24:MI:SS'), ''),
			COALESCE("UpdatedBy", ''),
			COALESCE(TO_CHAR("UpdatedAt", 'YYYY-MM-DD HH24:MI:SS'), ''),
			COALESCE("RowVersion", 1)
		FROM "_ERPActions"
		WHERE %s
		ORDER BY "IdxNo" ASC, "Id" ASC
		OFFSET %d LIMIT %d
	`, where, offset, pageSize)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		s.logger.Error("QueryActions error", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	var list []ActionItem
	for rows.Next() {
		var a ActionItem
		var rv int64
		if err := rows.Scan(
			&a.Id,
			&a.ActionKey,
			&a.ActionName,
			&a.Description,
			&a.Icon,
			&a.IdxNo,
			&a.Active,
			&a.CreatedBy,
			&a.CreatedAt,
			&a.UpdatedBy,
			&a.UpdatedAt,
			&rv,
		); err != nil {
			continue
		}
		a.Key = a.ActionKey
		a.Name = a.ActionName
		a.CreatedByName = a.CreatedBy
		a.UpdatedByName = a.UpdatedBy
		a.Rowversion = rv
		a.RowVersion = rv
		list = append(list, a)
	}

	totalPages := 1
	if pageSize > 0 && totalFiltered > 0 {
		totalPages = int(math.Ceil(float64(totalFiltered) / float64(pageSize)))
	}

	return &ActionQueryResult{
		List:         list,
		Page:         page,
		PageSize:     pageSize,
		TotalRows:    totalFiltered,
		Total:        totalFiltered,
		TotalPages:   totalPages,
		TotalAll:     totalAll,
		LoadedCount:  len(list),
		TotalColumns: 11,
	}, nil
}
