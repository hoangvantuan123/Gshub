package report_query

import (
	"context"
	"sort"

	"gorm.io/gorm"
	models "service-datahub/models/report"
)

type MasterReference struct{ ID, RegCode string }

// Dropdown limits must never limit the master dates used by historical reports.
// Fetch only missing referenced masters, in bounded queries, using their indexes.
func CompleteMasterDates(ctx context.Context, db *gorm.DB, masters []models.ERPPlanMaster, refs []MasterReference) ([]models.ERPPlanMaster, error) {
	return completeMasterDates(masters, refs, func(ids, codes []string) ([]models.ERPPlanMaster, error) {
		var found []models.ERPPlanMaster
		err := db.WithContext(ctx).Model(&models.ERPPlanMaster{}).
			Select(`"IdSeq", "RegCode", "ApplyDate"`).
			Where(`"IdSeq" IN ? OR "RegCode" IN ?`, ids, codes).Find(&found).Error
		return found, err
	})
}

func completeMasterDates(masters []models.ERPPlanMaster, refs []MasterReference, load func([]string, []string) ([]models.ERPPlanMaster, error)) ([]models.ERPPlanMaster, error) {
	knownIDs, knownCodes := map[string]bool{}, map[string]bool{}
	for _, master := range masters {
		knownIDs[master.IdSeq] = true
		knownCodes[master.RegCode] = true
	}
	missingIDs, missingCodes := map[string]bool{}, map[string]bool{}
	for _, ref := range refs {
		if ref.ID != "" && !knownIDs[ref.ID] {
			missingIDs[ref.ID] = true
		}
		if ref.RegCode != "" && !knownCodes[ref.RegCode] {
			missingCodes[ref.RegCode] = true
		}
	}
	ids, codes := make([]string, 0, len(missingIDs)), make([]string, 0, len(missingCodes))
	for id := range missingIDs {
		ids = append(ids, id)
	}
	for code := range missingCodes {
		codes = append(codes, code)
	}
	sort.Strings(ids)
	sort.Strings(codes)
	for len(ids) > 0 || len(codes) > 0 {
		idEnd, codeEnd := min(1000, len(ids)), min(1000, len(codes))
		found, err := load(ids[:idEnd], codes[:codeEnd])
		if err != nil {
			return nil, err
		}
		for _, master := range found {
			if !knownIDs[master.IdSeq] {
				masters = append(masters, master)
				knownIDs[master.IdSeq] = true
			}
		}
		ids, codes = ids[idEnd:], codes[codeEnd:]
	}
	return masters, nil
}
