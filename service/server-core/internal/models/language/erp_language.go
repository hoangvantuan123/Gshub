package language

import (
	"time"
)

// ERPLanguage corresponds to the _ERPLanguage table. LanguageSeq stays INTEGER.
type ERPLanguage struct {
	LanguageSeq  int        `db:"LanguageSeq" json:"LanguageSeq"`
	IdxNo        *int       `db:"IdxNo" json:"IdxNo,omitempty"`
	LanguageName *string    `db:"LanguageName" json:"LanguageName"`
	Remark       *string    `db:"Remark" json:"Remark,omitempty"`
	LanguageCode *string    `db:"LanguageCode" json:"LanguageCode"`
	RowVersion   int64      `db:"RowVersion" json:"RowVersion,omitempty"`
	CreatedBy    *string    `db:"CreatedBy" json:"CreatedBy,omitempty"`
	CreatedAt    *time.Time `db:"CreatedAt" json:"CreatedAt,omitempty"`
	UpdatedBy    *string    `db:"UpdatedBy" json:"UpdatedBy,omitempty"`
	UpdatedAt    *time.Time `db:"UpdatedAt" json:"UpdatedAt,omitempty"`
}


type ERPLanguageWeb = ERPLanguage
