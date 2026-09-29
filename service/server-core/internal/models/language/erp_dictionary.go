package language

import (
	"time"
)

// ERPDictionary corresponds to the _ERPDictionary table with UUIDv7 IdSeq. LanguageSeq stays INTEGER.
type ERPDictionary struct {
	IdSeq       string     `db:"IdSeq" json:"IdSeq"`
	WordSeq     *int       `db:"WordSeq" json:"WordSeq"`
	IdxNo       *int       `db:"IdxNo" json:"IdxNo,omitempty"`
	LanguageSeq *int       `db:"LanguageSeq" json:"LanguageSeq,omitempty"`
	Word        *string    `db:"Word" json:"Word"`
	Description *string    `db:"Description" json:"Description,omitempty"`
	RowVersion  int64      `db:"RowVersion" json:"RowVersion,omitempty"`
	CreatedBy   *string    `db:"CreatedBy" json:"CreatedBy,omitempty"`
	CreatedAt   *time.Time `db:"CreatedAt" json:"CreatedAt,omitempty"`
	UpdatedBy   *string    `db:"UpdatedBy" json:"UpdatedBy,omitempty"`
	UpdatedAt   *time.Time `db:"UpdatedAt" json:"UpdatedAt,omitempty"`
}


type ERPDictionarysWeb = ERPDictionary
