package lang

import (
	"context"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	"server-core/internal/platform/cache"
)

// LangD - Xóa danh sách ngôn ngữ
func (s *LanguageService) LangD(ctx context.Context, ids []int) (any, error) {
	if len(ids) == 0 {
		return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsDelete)
	}
	if err := config.ValidateBatchLimit(len(ids), "xóa", "LANGUAGE"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var count int
	err = tx.GetContext(ctx, &count, `SELECT COUNT(*) FROM "_ERPDictionary" WHERE "LanguageSeq" = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to check constraint for language deletion: %w", err)
	}
	if count > 0 {
		return nil, constants.NewError(constants.CodeDeleteConflict, constants.MsgDeleteConflictGeneric)
	}

	res, err := tx.ExecContext(ctx, `DELETE FROM "_ERPLanguage" WHERE "LanguageSeq" = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to delete languages: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.GetCache().DeletePrefix(ctx, "lang_q:")
	s.publishKafkaEvent("LANG_DELETED", ids)

	return map[string]interface{}{
		"Message":      fmt.Sprintf(constants.MsgDeleteSuccess, rowsAffected),
		"DeletedCount": rowsAffected,
		"DeletedIds":   ids,
	}, nil
}
