package action_perm

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	domain "server-core/internal/models/roles"
	"server-core/internal/platform/cache"

	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// ActionGroupPermsQ truy vấn quyền hạn action
func (s *ActionLevelPermsService) ActionGroupPermsQ(ctx context.Context, opts ActionGroupPermsQueryOptions) ([]domain.ERPGroupActionPerms, error) {
	optBytes, _ := json.Marshal(opts)
	hash := md5.Sum(optBytes)
	cacheKey := fmt.Sprintf("action_group_perms_q:%s", hex.EncodeToString(hash[:]))

	if val, ok := cache.GetCache().Get(ctx, cacheKey); ok {
		if result, ok := val.([]domain.ERPGroupActionPerms); ok {
			if s.log != nil {
				s.log.Info("[RAM CACHE HIT] Trả về ActionGroupPermsQ từ RAM (0 SQL SELECT vào PostgreSQL!)", zap.String("cacheKey", cacheKey))
			}
			return result, nil
		}
	}

	columns := "*"
	if len(opts.Select) > 0 {
		columns = strings.Join(opts.Select, ", ")
	}

	query := fmt.Sprintf(`SELECT %s FROM "_ERPGroupActionPerms" WHERE 1=1`, columns)
	args := map[string]interface{}{}

	if len(opts.Ids) > 0 {
		query += ` AND "Idseq" IN (:ids)`
		args["ids"] = opts.Ids
	}
	if opts.Name != "" {
		query += ` AND "Name" ILIKE :name`
		args["name"] = "%" + opts.Name + "%"
	}
	if opts.ScreenName != "" {
		query += ` AND "ScreenName" ILIKE :screenName`
		args["screenName"] = "%" + opts.ScreenName + "%"
	}

	if opts.OrderBy != "" {
		query += fmt.Sprintf(` ORDER BY %s`, opts.OrderBy)
	} else {
		query += ` ORDER BY "Idseq" ASC`
	}

	if opts.Limit > 0 {
		query += fmt.Sprintf(` LIMIT %d`, opts.Limit)
	}
	if opts.Offset > 0 {
		query += fmt.Sprintf(` OFFSET %d`, opts.Offset)
	}

	query, argsList, err := sqlx.Named(query, args)
	if err != nil {
		return nil, err
	}
	query, argsList, err = sqlx.In(query, argsList...)
	if err != nil {
		return nil, err
	}
	query = s.db.Rebind(query)

	var records []domain.ERPGroupActionPerms
	err = s.db.SelectContext(ctx, &records, query, argsList...)
	if err != nil {
		return nil, fmt.Errorf("failed to query records: %w", err)
	}

	cache.GetCache().Set(ctx, cacheKey, records, 30*time.Minute)

	return records, nil
}
