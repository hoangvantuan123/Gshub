package dict

import (
	"context"
	"errors"
	"fmt"

	"server-core/internal/config"
	"server-core/internal/constants"
	domain "server-core/internal/models/language"
	"server-core/internal/platform/cache"
)

// DictU - Cập nhật từ điển
func (s *DictService) DictU(ctx context.Context, words []domain.ERPDictionary) ([]domain.ERPDictionary, error) {
	if len(words) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsUpdate))
	}
	if err := config.ValidateBatchLimit(len(words), "cập nhật", "DICTIONARY"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `UPDATE "_ERPDictionary" SET 
				"WordSeq" = :WordSeq, 
				"IdxNo" = :IdxNo, 
				"LanguageSeq" = :LanguageSeq, 
				"Word" = :Word, 
				"Description" = :Description, 
				"UpdatedBy" = :UpdatedBy 
			  WHERE ("IdSeq" = :IdSeq AND :IdSeq != '' AND :IdSeq != '0')
			     OR ("WordSeq" = :WordSeq AND "LanguageSeq" = :LanguageSeq)
			  RETURNING "IdSeq", "WordSeq", "IdxNo", "LanguageSeq", "Word", "Description", "UpdatedBy"`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	updatedWords := make([]domain.ERPDictionary, 0, len(words))
	for _, w := range words {
		if (w.IdSeq == "" || w.IdSeq == "0") && (w.WordSeq == nil || *w.WordSeq <= 0 || w.LanguageSeq == nil || *w.LanguageSeq <= 0) {
			return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgInvalidID, w.IdSeq)
		}
		if w.UpdatedBy != nil && *w.UpdatedBy == "" {
			w.UpdatedBy = nil
		}

		var updatedWord domain.ERPDictionary
		err = stmt.GetContext(ctx, &updatedWord, w)
		if err != nil {
			return nil, fmt.Errorf("failed to update dictionary ID %v: %w", w.IdSeq, err)
		}
		updatedWords = append(updatedWords, updatedWord)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	_ = s.UpdateVersionControl(ctx, 1, "vi")
	cache.GetCache().DeletePrefix(ctx, "dict_q:")
	s.publishKafkaEvent("DICT_UPDATED", updatedWords)

	return updatedWords, nil
}
