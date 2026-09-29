package system_user

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"server-core/internal/platform/cache"

	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// SystemUsersQ truy vấn người dùng hệ thống (System Users)
func (s *SystemUsersService) SystemUsersQ(ctx context.Context, opts SystemUserQueryOptions) (any, error) {
	optBytes, _ := json.Marshal(opts)
	hash := md5.Sum(optBytes)
	cacheKey := fmt.Sprintf("system_users_q:%s", hex.EncodeToString(hash[:]))

	if val, ok := cache.GetCache().Get(ctx, cacheKey); ok {
		if s.log != nil {
			s.log.Info("[RAM CACHE HIT] Trả về SystemUsersQ trực tiếp từ RAM (0 SQL SELECT vào PostgreSQL!)", zap.String("cacheKey", cacheKey))
		}
		return val, nil
	}

	columns := `
		u."UserSeq", u."UserId", u."UserName", u."Remark", u."IdxNo",
		CASE WHEN u."Active" = 1 THEN true ELSE false END AS "Active",
		CASE WHEN u."CheckPass1" = 1 THEN true ELSE false END AS "CheckPass1",
		CASE WHEN u."StatusAcc" = 1 THEN true ELSE false END AS "StatusAcc",
		u."PartSeq", u."ProdDepartSeq", u."PositionSeq", u."CanScanQR",
		d."DepartmentName" AS "PartName",
		f."ProdLocationName" AS "ProdDepartName",
		g."PositionName" AS "PositionName"
	`
	if len(opts.Select) > 0 {
		columns = strings.Join(opts.Select, ", ")
	}

	query := fmt.Sprintf(`
		SELECT
			%s
		FROM "_ERPUsers" u
		LEFT JOIN "_ERPDepartment" d ON u."PartSeq" = d."IdSeq"
		LEFT JOIN "_ERPProdLocation" f ON u."ProdDepartSeq" = f."IdSeq"
		LEFT JOIN "_ERPPosition" g ON u."PositionSeq" = g."IdSeq"
		WHERE u."UserSeq" != 1
	`, columns)

	args := map[string]interface{}{}

	if opts.UserId != "" {
		query += ` AND u."UserId" ILIKE :userId`
		args["userId"] = "%" + opts.UserId + "%"
	}
	if opts.UserName != "" {
		query += ` AND u."UserName" ILIKE :userName`
		args["userName"] = "%" + opts.UserName + "%"
	}
	if opts.PartSeq != nil {
		query += ` AND u."PartSeq" = :partSeq`
		args["partSeq"] = *opts.PartSeq
	}

	if opts.OrderBy != "" {
		query += fmt.Sprintf(` ORDER BY %s`, opts.OrderBy)
	} else {
		query += ` ORDER BY u."UserSeq" ASC`
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

	rows, err := s.db.QueryxContext(ctx, query, argsList...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		row := make(map[string]interface{})
		err := rows.MapScan(row)
		if err != nil {
			return nil, err
		}
		result = append(result, row)
	}

	cache.GetCache().Set(ctx, cacheKey, result, 30*time.Minute)

	return result, nil
}
