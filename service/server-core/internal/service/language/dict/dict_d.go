package dict

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"

	"server-core/internal/config"
	"server-core/internal/constants"
	"server-core/internal/platform/cache"

	"github.com/lib/pq"
)

// DictD - Xóa từ điển
func (s *DictService) DictD(ctx context.Context, ids []string) (any, error) {
	var cleanIds []string
	var wordSeqs []int

	for _, id := range ids {
		idStr := strings.TrimSpace(id)
		if idStr == "" || idStr == "0" {
			continue
		}
		cleanIds = append(cleanIds, idStr)
		if wSeq, err := strconv.Atoi(idStr); err == nil && wSeq > 0 {
			wordSeqs = append(wordSeqs, wSeq)
		}
	}

	if len(cleanIds) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if err := config.ValidateBatchLimit(len(cleanIds), "xóa", "DICTIONARY"); err != nil {
		return nil, err
	}

	var res sql.Result
	var err error

	if len(wordSeqs) > 0 {
		query := `DELETE FROM "_ERPDictionary" WHERE "IdSeq" = ANY($1) OR "WordSeq" = ANY($2)`
		res, err = s.db.ExecContext(ctx, query, pq.Array(cleanIds), pq.Array(wordSeqs))
	} else {
		query := `DELETE FROM "_ERPDictionary" WHERE "IdSeq" = ANY($1)`
		res, err = s.db.ExecContext(ctx, query, pq.Array(cleanIds))
	}

	if err != nil {
		return nil, fmt.Errorf("failed to delete dictionary words: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()

	_ = s.UpdateVersionControl(ctx, 1, "vi")
	cache.GetCache().DeletePrefix(ctx, "dict_q:")
	s.publishKafkaEvent("DICT_DELETED", cleanIds)

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   cleanIds,
	}, nil
}

func (s *DictService) UpdateVersionControl(ctx context.Context, langSeq int, langCode string) error {
	langCode = strings.ToLower(strings.TrimSpace(langCode))
	if langCode == "" && langSeq > 0 {
		_ = s.db.QueryRowContext(ctx, `SELECT LOWER("LanguageCode") FROM "_ERPLanguage" WHERE "LanguageSeq" = $1 LIMIT 1`, langSeq).Scan(&langCode)
	}
	if langCode == "" {
		langCode = "vi"
	}
	if langSeq <= 0 {
		_ = s.db.QueryRowContext(ctx, `SELECT "LanguageSeq" FROM "_ERPLanguage" WHERE LOWER("LanguageCode") = $1 LIMIT 1`, langCode).Scan(&langSeq)
		if langSeq <= 0 {
			langSeq = 1
		}
	}

	versionHash := fmt.Sprintf("v%d_%s_%d", langSeq, langCode, time.Now().UnixNano())
	query := `
		INSERT INTO "_ERPDictVer" ("LanguageSeq", "LanguageCode", "VersionHash", "UpdatedAt")
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT ("LanguageSeq")
		DO UPDATE SET "LanguageCode" = EXCLUDED."LanguageCode", "VersionHash" = EXCLUDED."VersionHash", "UpdatedAt" = NOW()
	`
	_, err := s.db.ExecContext(ctx, query, langSeq, langCode, versionHash)
	return err
}

func (s *DictService) GetDictVersion(ctx context.Context, langSeq int, langCode string) (map[string]interface{}, error) {
	var versionHash string
	var updatedAt time.Time
	var err error

	langCode = strings.ToLower(strings.TrimSpace(langCode))
	if langCode != "" {
		query := `SELECT "VersionHash", "UpdatedAt", "LanguageSeq" FROM "_ERPDictVer" WHERE "LanguageCode" = $1 OR "LanguageSeq" = $2 LIMIT 1`
		var foundSeq int
		err = s.db.QueryRowContext(ctx, query, langCode, langSeq).Scan(&versionHash, &updatedAt, &foundSeq)
		if err == nil && foundSeq > 0 {
			langSeq = foundSeq
		}
	} else if langSeq > 0 {
		query := `SELECT "VersionHash", "UpdatedAt", "LanguageCode" FROM "_ERPDictVer" WHERE "LanguageSeq" = $1 LIMIT 1`
		var foundCode string
		err = s.db.QueryRowContext(ctx, query, langSeq).Scan(&versionHash, &updatedAt, &foundCode)
		if err == nil && foundCode != "" {
			langCode = foundCode
		}
	}

	if err != nil {
		if langCode == "" && langSeq > 0 {
			_ = s.db.QueryRowContext(ctx, `SELECT LOWER("LanguageCode") FROM "_ERPLanguage" WHERE "LanguageSeq" = $1 LIMIT 1`, langSeq).Scan(&langCode)
		}
		if langCode == "" {
			langCode = "vi"
		}
		defaultHash := fmt.Sprintf("v%d_%s_default", langSeq, langCode)
		_ = s.UpdateVersionControl(ctx, langSeq, langCode)
		return map[string]interface{}{
			"languageSeq":  langSeq,
			"languageCode": langCode,
			"versionHash":  defaultHash,
			"updatedAt":    time.Now().Format(time.RFC3339),
		}, nil
	}

	return map[string]interface{}{
		"languageSeq":  langSeq,
		"languageCode": langCode,
		"versionHash":  versionHash,
		"updatedAt":    updatedAt.Format(time.RFC3339),
	}, nil
}
