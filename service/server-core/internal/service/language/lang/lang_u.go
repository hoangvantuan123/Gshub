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

// LangU - Cập nhật thông tin ngôn ngữ
func (s *LanguageService) LangU(ctx context.Context, langs []domain.ERPLanguage) ([]domain.ERPLanguage, error) {
	if len(langs) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsUpdate))
	}
	if err := config.ValidateBatchLimit(len(langs), "cập nhật", "LANGUAGE"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `UPDATE "_ERPLanguage" SET 
				"IdxNo" = :IdxNo, 
				"LanguageName" = :LanguageName, 
				"Remark" = :Remark, 
				"LanguageCode" = :LanguageCode, 
				"UpdatedBy" = :UpdatedBy, 
				"UpdatedAt" = NOW() 
			  WHERE "LanguageSeq" = :LanguageSeq
			  RETURNING "LanguageSeq", "IdxNo", "LanguageName", "Remark", "LanguageCode", "UpdatedBy"`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	updatedLangs := make([]domain.ERPLanguage, 0, len(langs))
	for _, l := range langs {
		var updatedLang domain.ERPLanguage
		err = stmt.GetContext(ctx, &updatedLang, l)
		if err != nil {
			return nil, fmt.Errorf("failed to update language: %w", err)
		}
		updatedLangs = append(updatedLangs, updatedLang)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.GetCache().DeletePrefix(ctx, "lang_q:")
	s.publishKafkaEvent("LANG_UPDATED", updatedLangs)

	return updatedLangs, nil
}
