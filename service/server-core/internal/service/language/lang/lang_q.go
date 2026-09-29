package lang

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"time"

	domain "server-core/internal/models/language"
	"server-core/internal/platform/cache"

	"github.com/jmoiron/sqlx"
)

// LangQ - Truy vấn danh sách ngôn ngữ
func (s *LanguageService) LangQ(ctx context.Context, languageName string) ([]domain.ERPLanguage, error) {
	hash := md5.Sum([]byte(languageName))
	cacheKey := fmt.Sprintf("lang_q:%s", hex.EncodeToString(hash[:]))

	if val, ok := cache.GetCache().Get(ctx, cacheKey); ok {
		if result, ok := val.([]domain.ERPLanguage); ok {
			return result, nil
		}
	}

	query := `SELECT "LanguageSeq", "IdxNo", "LanguageName", "Remark", "LanguageCode", "CreatedBy" FROM "_ERPLanguage" WHERE 1=1`
	args := map[string]interface{}{}

	if languageName != "" {
		query += ` AND "LanguageName" ILIKE :languageName`
		args["languageName"] = "%" + languageName + "%"
	}

	query += ` ORDER BY "IdxNo" ASC, "LanguageSeq" ASC`

	query, argsList, err := sqlx.Named(query, args)
	if err != nil {
		return nil, err
	}
	query = s.db.Rebind(query)

	var langs []domain.ERPLanguage
	err = s.db.SelectContext(ctx, &langs, query, argsList...)
	if err != nil {
		return nil, fmt.Errorf("failed to query languages: %w", err)
	}

	cache.GetCache().Set(ctx, cacheKey, langs, 30*time.Minute)

	return langs, nil
}
