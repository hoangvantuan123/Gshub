package prod_stats_detail

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	models "service-datahub/models/report"
	"service-datahub/services"
)

// cleanNumberStr chuẩn hóa chuỗi số (xử lý dấu chấm/phẩy phân cách hàng nghìn như 57.211 -> 57211)
func cleanNumberStr(ptr *string) *string {
	if ptr == nil {
		return nil
	}
	s := strings.TrimSpace(*ptr)
	if s == "" {
		return ptr
	}
	s = strings.ReplaceAll(s, " ", "")

	// Nếu có cả . và ,
	if strings.Contains(s, ".") && strings.Contains(s, ",") {
		lastDot := strings.LastIndex(s, ".")
		lastComma := strings.LastIndex(s, ",")
		if lastComma > lastDot {
			// Dạng VN/EU: 1.234,56 -> 1234.56
			s = strings.ReplaceAll(s, ".", "")
			s = strings.ReplaceAll(s, ",", ".")
		} else {
			// Dạng US: 1,234.56 -> 1234.56
			s = strings.ReplaceAll(s, ",", "")
		}
	} else if strings.Contains(s, ".") {
		parts := strings.Split(s, ".")
		if len(parts) > 2 {
			s = strings.Join(parts, "")
		} else if len(parts) == 2 && len(parts[1]) == 3 && len(parts[0]) >= 1 {
			// 57.211 -> 57211
			s = parts[0] + parts[1]
		}
	} else if strings.Contains(s, ",") {
		parts := strings.Split(s, ",")
		if len(parts) > 2 {
			s = strings.Join(parts, "")
		} else if len(parts) == 2 {
			if len(parts[1]) == 3 && len(parts[0]) >= 1 {
				// 57,211 -> 57211
				s = parts[0] + parts[1]
			} else {
				s = parts[0] + "." + parts[1]
			}
		}
	}
	return &s
}

// ProdStatsDetailA - Thêm mới danh sách dòng chi tiết Thống Kê Sản Xuất
func (s *ProdStatsDetailService) ProdStatsDetailA(
	ctx context.Context,
	items []models.ERPProdStatsDetail,
	userId string,
) ([]models.ERPProdStatsDetail, error) {
	if len(items) == 0 {
		return nil, errors.New("không có dòng chi tiết TKSX nào để thêm mới")
	}

	now := time.Now()
	for i := range items {
		if items[i].IdSeq == "" {
			items[i].IdSeq = services.GenerateUUIDv7()
		}
		items[i].WorkingTag = "A"
		items[i].RowVersion = 1
		items[i].CreatedBy = &userId
		items[i].UpdatedBy = &userId
		items[i].CreatedAt = &now
		items[i].UpdatedAt = &now
		items[i].IsActive = true

		NormalizeStatsItem(&items[i])
	}

	if err := s.db.WithContext(ctx).CreateInBatches(items, 500).Error; err != nil {
		return nil, err
	}

	s.totalAllCount.Add(int64(len(items)))
	return items, nil
}

// NormalizeStatsItem chuẩn hóa các trường số liệu của một dòng TKSX
func NormalizeStatsItem(item *models.ERPProdStatsDetail) {
	if item == nil {
		return
	}
	item.ProdQty = cleanNumberStr(item.ProdQty)
	item.PassQty = cleanNumberStr(item.PassQty)
	item.DefectQty = cleanNumberStr(item.DefectQty)
	item.ActualMeters = cleanNumberStr(item.ActualMeters)
	item.StandardMeters = cleanNumberStr(item.StandardMeters)
	item.TargetProdQty = cleanNumberStr(item.TargetProdQty)
	item.TargetPassQty = cleanNumberStr(item.TargetPassQty)

	item.BreakdownMinutes = cleanNumberStr(item.BreakdownMinutes)
	item.WaitingMaterialMinutes = cleanNumberStr(item.WaitingMaterialMinutes)
	item.SetupMinutes = cleanNumberStr(item.SetupMinutes)
	item.RepairMinutes = cleanNumberStr(item.RepairMinutes)
	item.TotalWasteMinutes = cleanNumberStr(item.TotalWasteMinutes)

	if item.TotalWasteMinutes == nil || strings.TrimSpace(*item.TotalWasteMinutes) == "" || *item.TotalWasteMinutes == "0" {
		bd := parseNumber(item.BreakdownMinutes, 0)
		wm := parseNumber(item.WaitingMaterialMinutes, 0)
		st := parseNumber(item.SetupMinutes, 0)
		rp := parseNumber(item.RepairMinutes, 0)
		sum := bd + wm + st + rp
		if sum > 0 {
			sumStr := fmt.Sprintf("%.1f", sum)
			sumStr = strings.TrimSuffix(sumStr, ".0")
			item.TotalWasteMinutes = &sumStr
		}
	}
}

