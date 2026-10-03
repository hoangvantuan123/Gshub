package plan_report

import (
	"math"
	"strconv"
	"strings"
	"time"
)

// Helper: Lấy giá trị filter không phân biệt chữ hoa/thường
func getFilterValue(filters map[string]string, keys ...string) string {
	for _, k := range keys {
		if v, ok := filters[k]; ok && strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
		if v, ok := filters[strings.ToLower(k)]; ok && strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
		if v, ok := filters[strings.ToUpper(k)]; ok && strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

// Helper: Parse chuỗi số an toàn
func parseNumber(val *string, defaultVal float64) float64 {
	if val == nil || strings.TrimSpace(*val) == "" {
		return defaultVal
	}
	s := strings.TrimSpace(*val)
	s = strings.ReplaceAll(s, " ", "")
	if strings.Contains(s, ".") && strings.Contains(s, ",") {
		lastDot := strings.LastIndex(s, ".")
		lastComma := strings.LastIndex(s, ",")
		if lastComma > lastDot {
			s = strings.ReplaceAll(s, ".", "")
			s = strings.ReplaceAll(s, ",", ".")
		} else {
			s = strings.ReplaceAll(s, ",", "")
		}
	} else if strings.Contains(s, ",") {
		parts := strings.Split(s, ",")
		if len(parts) == 2 && len(parts[1]) == 3 {
			s = parts[0] + parts[1]
		} else {
			s = strings.ReplaceAll(s, ",", ".")
		}
	}
	n, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return defaultVal
	}
	return n
}

// Helper: Chuẩn hóa ngày YYYY-MM-DD
func cleanDateString(dateVal *string) string {
	if dateVal == nil || strings.TrimSpace(*dateVal) == "" {
		return ""
	}
	s := strings.TrimSpace(*dateVal)
	if len(s) >= 10 && s[4] == '-' && s[7] == '-' {
		return s[:10]
	}
	if strings.Contains(s, "T") {
		parts := strings.Split(s, "T")
		return parts[0]
	}
	if strings.Contains(s, "/") {
		parts := strings.Split(strings.Split(s, " ")[0], "/")
		if len(parts) == 3 {
			m, d, y := parts[0], parts[1], parts[2]
			if len(y) == 2 {
				y = "20" + y
			}
			if len(m) == 1 {
				m = "0" + m
			}
			if len(d) == 1 {
				d = "0" + d
			}
			return y + "-" + m + "-" + d
		}
	}
	if strings.Contains(s, "-") {
		parts := strings.Split(strings.Split(s, " ")[0], "-")
		if len(parts) == 3 && len(parts[0]) <= 2 && len(parts[2]) == 4 {
			d, m, y := parts[0], parts[1], parts[2]
			if len(m) == 1 {
				m = "0" + m
			}
			if len(d) == 1 {
				d = "0" + d
			}
			return y + "-" + m + "-" + d
		}
	}
	return s
}

// Helper: Phân loại trạng thái ĐP-SX
func categorizeDpStatus(statusText *string, planQty, actualQty float64, opDate, routingDate *string) (string, string) {
	st := ""
	if statusText != nil {
		st = strings.TrimSpace(*statusText)
	}
	low := strings.ToLower(st)

	if strings.Contains(low, "sai ngày") || strings.Contains(low, "sai ngay") {
		return "SX_SAI_NGAY", "SX sai ngày KH"
	}
	if strings.Contains(low, "trượt") || strings.Contains(low, "truot") {
		return "TRUOT_KH", "Trượt KH"
	}
	if strings.Contains(low, "khớp job") || strings.Contains(low, "khop job") {
		return "KHOP_JOB", "Khớp job"
	}
	if strings.Contains(low, "khớp") || strings.Contains(low, "khop") || strings.Contains(low, "số lượng") || strings.Contains(low, "so luong") {
		return "KHOP_SL", "Khớp số lượng"
	}

	// Tự động suy luận nếu status rỗng
	cOp := cleanDateString(opDate)
	cRouting := cleanDateString(routingDate)
	if cOp != "" && cRouting != "" && cOp != cRouting {
		return "SX_SAI_NGAY", "SX sai ngày KH"
	}
	if planQty > 0 && actualQty < planQty*0.9 {
		return "TRUOT_KH", "Trượt KH"
	}
	if planQty > 0 && actualQty >= planQty {
		return "KHOP_SL", "Khớp số lượng"
	}
	return "KHOP_JOB", "Khớp job"
}

// Helper: Phân loại trạng thái thời gian
func categorizeTimeStatus(timeStatus *string) string {
	if timeStatus == nil || strings.TrimSpace(*timeStatus) == "" {
		return "Chưa có dữ liệu"
	}
	s := strings.TrimSpace(*timeStatus)
	low := strings.ToLower(s)
	if strings.Contains(low, "chậm") || strings.Contains(low, "cham") {
		return "Chậm hơn ĐM"
	}
	if strings.Contains(low, "nhanh") {
		return "Nhanh hơn ĐM"
	}
	if strings.Contains(low, "đúng") || strings.Contains(low, "dung") {
		return "Đúng ĐM"
	}
	return "Chưa có dữ liệu"
}

// Helper: Phân loại trạng thái Capa
func categorizeCapaStatus(capaStatus *string) string {
	if capaStatus == nil || strings.TrimSpace(*capaStatus) == "" {
		return "Trống / Đúng capa"
	}
	s := strings.TrimSpace(*capaStatus)
	low := strings.ToLower(s)
	if strings.Contains(low, "chậm") || strings.Contains(low, "cham") {
		return "Chậm hơn ĐM"
	}
	if strings.Contains(low, "nhanh") {
		return "Nhanh hơn ĐM"
	}
	return "Trống / Đúng capa"
}

// Helper: Tính số ngày giữa 2 mốc thời gian
func calcDaysBetween(fromStr, toStr string) int {
	if fromStr == "" || toStr == "" {
		return 1
	}
	t1, err1 := time.Parse("2006-01-02", fromStr)
	t2, err2 := time.Parse("2006-01-02", toStr)
	if err1 == nil && err2 == nil {
		diff := int(math.Abs(t2.Sub(t1).Hours()/24.0)) + 1
		if diff > 0 {
			return diff
		}
	}
	return 1
}

// Helper: Lấy danh sách key từ map
func getKeysFromMap(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		if strings.TrimSpace(k) != "" {
			keys = append(keys, k)
		}
	}
	return keys
}
