package utils

import (
	"encoding/json"
	"fmt"
	domain "server-core/internal/models/system"
	"reflect"
	"strings"
)

// ComputeFieldDiffs compares two structs or maps and returns a slice of SysDataChangeDetail
// representing modified fields (OldValue -> NewValue)
func ComputeFieldDiffs(oldVal, newVal interface{}) []domain.SysDataChangeDetail {
	var diffs []domain.SysDataChangeDetail

	oldMap := toMap(oldVal)
	newMap := toMap(newVal)

	if len(oldMap) == 0 && len(newMap) == 0 {
		return diffs
	}

	// Compare fields present in newMap
	for k, newV := range newMap {
		// Skip internal system fields
		if isIgnoredField(k) {
			continue
		}

		oldV, exists := oldMap[k]
		oldStr := stringify(oldV)
		newStr := stringify(newV)

		if !exists {
			// Newly added field
			if newStr != "" {
				diffs = append(diffs, domain.SysDataChangeDetail{
					FieldName: k,
					OldValue:  "",
					NewValue:  newStr,
				})
			}
		} else if oldStr != newStr {
			// Field value changed
			diffs = append(diffs, domain.SysDataChangeDetail{
				FieldName: k,
				OldValue:  oldStr,
				NewValue:  newStr,
			})
		}
	}

	return diffs
}

func isIgnoredField(fieldName string) bool {
	lower := strings.ToLower(fieldName)
	ignored := map[string]bool{
		"password2":   true,
		"password":    true,
		"token":       true,
		"updatedat":   true,
		"createdat":   true,
		"deviceinfo":  true,
		"deviceinfoweb": true,
		"deviceinfosoft": true,
		"deviceinfoapp": true,
	}
	return ignored[lower]
}

func toMap(val interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	if val == nil {
		return result
	}

	// Handle map directly
	if m, ok := val.(map[string]interface{}); ok {
		return m
	}

	// Convert struct/slice via JSON marshal
	bytes, err := json.Marshal(val)
	if err != nil {
		return result
	}
	_ = json.Unmarshal(bytes, &result)
	return result
}

func stringify(val interface{}) string {
	if val == nil {
		return ""
	}
	v := reflect.ValueOf(val)
	if !v.IsValid() {
		return ""
	}
	if v.Kind() == reflect.Ptr {
		if v.IsNil() {
			return ""
		}
		return stringify(v.Elem().Interface())
	}
	switch v.Kind() {
	case reflect.String:
		return v.String()
	case reflect.Bool:
		return fmt.Sprintf("%t", v.Bool())
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return fmt.Sprintf("%d", v.Int())
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return fmt.Sprintf("%d", v.Uint())
	case reflect.Float32, reflect.Float64:
		return fmt.Sprintf("%g", v.Float())
	default:
		bytes, err := json.Marshal(val)
		if err != nil {
			return fmt.Sprintf("%v", val)
		}
		return string(bytes)
	}
}
