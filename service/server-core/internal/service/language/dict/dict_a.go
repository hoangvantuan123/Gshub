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

// DictA - Thêm mới từ điển
func (s *DictService) DictA(ctx context.Context, words []domain.ERPDictionary) ([]domain.ERPDictionary, error) {
	if len(words) == 0 {
		return nil, errors.New(constants.FormatError(constants.ErrCodeInvalidInput, constants.MsgNoRecordsInsert))
	}
	if err := config.ValidateBatchLimit(len(words), "thêm mới", "DICTIONARY"); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var currentMax int
	err = tx.GetContext(ctx, &currentMax, `SELECT COALESCE(MAX("WordSeq"), 0) FROM "_ERPDictionary"`)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate max WordSeq: %w", err)
	}

	for i := range words {
		if words[i].WordSeq == nil || *words[i].WordSeq <= 0 {
			currentMax++
			nextSeq := currentMax
			words[i].WordSeq = &nextSeq
		}
	}

	query := `INSERT INTO "_ERPDictionary" ("WordSeq", "IdxNo", "LanguageSeq", "Word", "Description", "CreatedBy") 
	          VALUES (:WordSeq, :IdxNo, :LanguageSeq, :Word, :Description, :CreatedBy) 
			  RETURNING "IdSeq", "WordSeq", "IdxNo", "LanguageSeq", "Word", "Description", "CreatedBy"`

	stmt, err := tx.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	newWords := make([]domain.ERPDictionary, 0, len(words))
	for _, w := range words {
		if w.CreatedBy != nil && *w.CreatedBy == "" {
			w.CreatedBy = nil
		}
		var newWord domain.ERPDictionary
		err = stmt.GetContext(ctx, &newWord, w)
		if err != nil {
			return nil, fmt.Errorf("failed to insert dictionary word: %w", err)
		}
		newWords = append(newWords, newWord)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	_ = s.UpdateVersionControl(ctx, 1, "vi")
	cache.GetCache().DeletePrefix(ctx, "dict_q:")
	s.publishKafkaEvent("DICT_CREATED", newWords)

	return newWords, nil
}
