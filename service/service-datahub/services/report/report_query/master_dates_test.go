package report_query

import (
	"errors"
	"fmt"
	"testing"

	models "service-datahub/models/report"
)

func TestMasterDatesCoverHistoryBeyondDropdownLimit(t *testing.T) {
	masters := []models.ERPPlanMaster{{IdSeq: "recent", RegCode: "RECENT"}}
	refs := []MasterReference{{ID: "recent", RegCode: "RECENT"}}
	for i := 0; i < 20001; i++ {
		refs = append(refs, MasterReference{ID: fmt.Sprint(i % 2001), RegCode: fmt.Sprintf("REG-%d", i%2001)})
	}
	calls := 0
	completed, err := completeMasterDates(masters, refs, func(ids, codes []string) ([]models.ERPPlanMaster, error) {
		calls++
		if len(ids) > 1000 || len(codes) > 1000 {
			t.Fatal("unbounded query")
		}
		found := make([]models.ERPPlanMaster, 0, len(ids))
		for _, id := range ids {
			found = append(found, models.ERPPlanMaster{IdSeq: id, RegCode: "REG-" + id})
		}
		return found, nil
	})
	if err != nil || calls != 3 || len(completed) != 2002 || completed[0].IdSeq != "recent" {
		t.Fatalf("history lost or dropdown order changed: %d masters, %d calls, %v", len(completed), calls, err)
	}
}

func TestMasterDateFailureIsNotSilentlyReplacedByDetailDate(t *testing.T) {
	_, err := completeMasterDates(nil, []MasterReference{{ID: "old"}}, func([]string, []string) ([]models.ERPPlanMaster, error) {
		return nil, errors.New("database unavailable")
	})
	if err == nil {
		t.Fatal("metadata failure hidden")
	}
}
