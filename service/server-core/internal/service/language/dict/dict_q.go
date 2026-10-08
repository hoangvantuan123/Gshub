package dict

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	domain "server-core/internal/models/language"
	"server-core/internal/platform/cache"

	"github.com/jmoiron/sqlx"
)

// DictQ - Truy vấn từ điển
func (s *DictService) DictQ(ctx context.Context, opts DictQueryOptions) ([]domain.ERPDictionary, error) {
	optsBytes, _ := json.Marshal(opts)
	hash := md5.Sum(optsBytes)
	cacheKey := fmt.Sprintf("dict_q:%s", hex.EncodeToString(hash[:]))

	if val, ok := cache.GetCache().Get(ctx, cacheKey); ok {
		if result, ok := val.([]domain.ERPDictionary); ok {
			return result, nil
		}
	}

	query := `
		SELECT "IdSeq", "WordSeq", "IdxNo", "LanguageSeq", "Word"
		FROM "_ERPDictionary"
		WHERE 1=1
	`
	args := map[string]interface{}{}

	targetLangSeq := opts.LanguageSeq
	if targetLangSeq <= 0 && opts.KeyItem1 != "" {
		if val, err := strconv.Atoi(opts.KeyItem1); err == nil && val > 0 {
			targetLangSeq = val
		}
	}

	if targetLangSeq <= 0 {
		code := opts.KeyItem2
		if code == "" && opts.KeyItem1 != "" {
			code = opts.KeyItem1
		}
		if code != "" {
			code = strings.ToLower(strings.TrimSpace(code))
			_ = s.db.QueryRowContext(ctx, `SELECT "LanguageSeq" FROM "_ERPLanguage" WHERE LOWER("LanguageCode") = $1 LIMIT 1`, code).Scan(&targetLangSeq)
		}
	}

	if targetLangSeq > 0 {
		query += ` AND "LanguageSeq" = :targetLangSeq`
		args["targetLangSeq"] = targetLangSeq
	}

	if opts.WordSeq > 0 {
		query += ` AND "WordSeq" = :wordSeq`
		args["wordSeq"] = opts.WordSeq
	}
	if opts.Word != "" {
		query += ` AND "Word" ILIKE :word`
		args["word"] = "%" + opts.Word + "%"
	}
	if opts.KeyItem3 != "" {
		if val, err := strconv.Atoi(opts.KeyItem3); err == nil && val > 0 {
			query += ` AND "WordSeq" = :keyItem3`
			args["keyItem3"] = val
		}
	}

	if opts.OrderBy != "" {
		query += fmt.Sprintf(` ORDER BY %s`, opts.OrderBy)
	} else {
		query += ` ORDER BY "WordSeq" ASC, "IdSeq" ASC`
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

	var words []domain.ERPDictionary
	err = s.db.SelectContext(ctx, &words, query, argsList...)
	if err != nil {
		return nil, fmt.Errorf("failed to query dictionary words: %w", err)
	}

	cache.GetCache().Set(ctx, cacheKey, words, 30*time.Minute)

	return words, nil
}
