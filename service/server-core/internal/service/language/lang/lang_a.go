package lang

import (
	"context"
	"errors"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	domain "server-core/internal/models/language"
	"server-core/internal/platform/cache"
)

// LangA - Thêm mới ngôn ngữ
func (s *LanguageService) LangA(ctx context.Context, langs []domain.ERPLanguage) ([]domain.ERPLanguage, error) {
	if len(langs) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsInsert))
	}
	if err := config.ValidateBatchLimit(len(langs), "thêm mới", "LANGUAGE"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `INSERT INTO "_ERPLanguage" ("IdxNo", "LanguageName", "Remark", "LanguageCode", "CreatedBy", "CreatedAt") 
	          VALUES (:IdxNo, :LanguageName, :Remark, :LanguageCode, :CreatedBy, NOW()) 
			  RETURNING "LanguageSeq", "IdxNo", "LanguageName", "Remark", "LanguageCode", "CreatedBy"`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	newLangs := make([]domain.ERPLanguage, 0, len(langs))
	for _, l := range langs {
		if l.CreatedBy != nil && *l.CreatedBy == "" {
			l.CreatedBy = nil
		}
		var newLang domain.ERPLanguage
		err = stmt.GetContext(ctx, &newLang, l)
		if err != nil {
			return nil, fmt.Errorf("failed to insert language: %w", err)
		}
		newLangs = append(newLangs, newLang)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.GetCache().DeletePrefix(ctx, "lang_q:")
	s.publishKafkaEvent("LANG_CREATED", newLangs)

	return newLangs, nil
}
