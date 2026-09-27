package bravo

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ExtractRows converts flexible Bravo JSON responses (including rtv.cln + rtv.rws) into slice of map records
func ExtractRows(raw []byte) []map[string]interface{} {
	if len(raw) == 0 {
		return []map[string]interface{}{}
	}

	// Case 1: Bravo Web ERP format { "rtv": { "tbl": [ { "cln": [...], "rws": [ { "crt": [...] } ] } ] } }
	// or { "rtv": { "cln": [...], "rws": [ { "crt": [...] } ] } } or root { "cln": [...], "rws": [...] }
	var bravoRtv struct {
		Rtv struct {
			Tbl []struct {
				Cln []struct {
					Cln string `json:"cln"`
				} `json:"cln"`
				Rws []struct {
					Crt []interface{} `json:"crt"`
				} `json:"rws"`
			} `json:"tbl"`
			Cln []struct {
				Cln string `json:"cln"`
			} `json:"cln"`
			Rws []struct {
				Crt []interface{} `json:"crt"`
			} `json:"rws"`
		} `json:"rtv"`
		Tbl []struct {
			Cln []struct {
				Cln string `json:"cln"`
			} `json:"cln"`
			Rws []struct {
				Crt []interface{} `json:"crt"`
			} `json:"rws"`
		} `json:"tbl"`
		Cln []struct {
			Cln string `json:"cln"`
		} `json:"cln"`
		Rws []struct {
			Crt []interface{} `json:"crt"`
		} `json:"rws"`
	}
	if err := json.Unmarshal(raw, &bravoRtv); err == nil {
		// Priority 1: rtv.tbl[0]
		if len(bravoRtv.Rtv.Tbl) > 0 && len(bravoRtv.Rtv.Tbl[0].Cln) > 0 {
			tbl := bravoRtv.Rtv.Tbl[0]
			colNames := make([]string, len(tbl.Cln))
			for i, c := range tbl.Cln {
				colNames[i] = c.Cln
			}
			var res []map[string]interface{}
			for _, r := range tbl.Rws {
				rowMap := make(map[string]interface{})
				for i, val := range r.Crt {
					if i < len(colNames) {
						rowMap[colNames[i]] = val
					}
				}
				res = append(res, rowMap)
			}
			return res
		}

		// Priority 2: tbl[0] at root
		if len(bravoRtv.Tbl) > 0 && len(bravoRtv.Tbl[0].Cln) > 0 {
			tbl := bravoRtv.Tbl[0]
			colNames := make([]string, len(tbl.Cln))
			for i, c := range tbl.Cln {
				colNames[i] = c.Cln
			}
			var res []map[string]interface{}
			for _, r := range tbl.Rws {
				rowMap := make(map[string]interface{})
				for i, val := range r.Crt {
					if i < len(colNames) {
						rowMap[colNames[i]] = val
					}
				}
				res = append(res, rowMap)
			}
			return res
		}

		// Priority 3: rtv.cln / cln at root
		clnList := bravoRtv.Rtv.Cln
		rwsList := bravoRtv.Rtv.Rws
		if len(clnList) == 0 && len(bravoRtv.Cln) > 0 {
			clnList = bravoRtv.Cln
			rwsList = bravoRtv.Rws
		}

		if len(clnList) > 0 {
			colNames := make([]string, len(clnList))
			for i, c := range clnList {
				colNames[i] = c.Cln
			}

			var res []map[string]interface{}
			for _, r := range rwsList {
				rowMap := make(map[string]interface{})
				for i, val := range r.Crt {
					if i < len(colNames) {
						rowMap[colNames[i]] = val
					}
				}
				res = append(res, rowMap)
			}
			return res
		}
	}

	// Case 2: Direct Array [ {...}, {...} ]
	var arr []map[string]interface{}
	if err := json.Unmarshal(raw, &arr); err == nil {
		return arr
	}

	// Case 3: Direct Array of interfaces
	var arrGeneric []interface{}
	if err := json.Unmarshal(raw, &arrGeneric); err == nil {
		var res []map[string]interface{}
		for _, item := range arrGeneric {
			if m, ok := item.(map[string]interface{}); ok {
				res = append(res, m)
			}
		}
		return res
	}

	// Case 4: Object containing data/rows/result/records/Result
	var obj map[string]interface{}
	if err := json.Unmarshal(raw, &obj); err == nil {
		for _, key := range []string{"data", "rows", "Rows", "Data", "result", "Result", "records", "Records", "items", "Items"} {
			if val, exists := obj[key]; exists {
				if list, ok := val.([]interface{}); ok {
					var res []map[string]interface{}
					for _, item := range list {
						if m, ok := item.(map[string]interface{}); ok {
							res = append(res, m)
						}
					}
					return res
				}
				if nestedObj, ok := val.(map[string]interface{}); ok {
					for _, subKey := range []string{"rows", "Rows", "data", "Data", "records"} {
						if subVal, subExists := nestedObj[subKey]; subExists {
							if subList, ok := subVal.([]interface{}); ok {
								var res []map[string]interface{}
								for _, item := range subList {
									if m, ok := item.(map[string]interface{}); ok {
										res = append(res, m)
									}
								}
								return res
							}
						}
					}
				}
			}
		}

		// If object itself represents a single row, return it
		if len(obj) > 0 {
			return []map[string]interface{}{obj}
		}
	}

	return []map[string]interface{}{}
}

// ExtractOpv extracts total record count and current page number from Bravo ERP's "opv": [totalCount, currentPage]
func ExtractOpv(raw []byte) (int, int, bool) {
	var bravoResp struct {
		Opv []interface{} `json:"opv"`
	}
	if err := json.Unmarshal(raw, &bravoResp); err == nil && len(bravoResp.Opv) >= 2 {
		total := 0
		page := 0
		if t, ok := bravoResp.Opv[0].(float64); ok {
			total = int(t)
		}
		if p, ok := bravoResp.Opv[1].(float64); ok {
			page = int(p)
		}
		return total, page, true
	}
	return 0, 0, false
}

// GetStringField safely returns the first non-empty string value among candidate keys
func GetStringField(row map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if val, exists := row[k]; exists && val != nil {
			strVal := fmt.Sprintf("%v", val)
			if strVal != "" && strVal != "<nil>" {
				return strVal
			}
		}
	}
	return ""
}

// GetFloatField safely parses and returns the first float64 value among candidate keys
func GetFloatField(row map[string]interface{}, keys ...string) float64 {
	for _, k := range keys {
		if val, exists := row[k]; exists && val != nil {
			switch v := val.(type) {
			case float64:
				return v
			case float32:
				return float64(v)
			case int:
				return float64(v)
			case int64:
				return float64(v)
			case string:
				var f float64
				if _, err := fmt.Sscanf(strings.TrimSpace(v), "%f", &f); err == nil {
					return f
				}
			}
		}
	}
	return 0
}

// GetBoolField safely parses and returns the first boolean value among candidate keys
func GetBoolField(row map[string]interface{}, keys ...string) bool {
	for _, k := range keys {
		if val, exists := row[k]; exists && val != nil {
			switch v := val.(type) {
			case bool:
				return v
			case int:
				return v == 1
			case float64:
				return v == 1
			case string:
				s := strings.ToLower(strings.TrimSpace(v))
				return s == "true" || s == "1" || s == "yes"
			}
		}
	}
	return false
}

