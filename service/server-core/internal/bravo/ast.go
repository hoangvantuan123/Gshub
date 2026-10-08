package bravo

import (
	"fmt"
	"strings"
)

// IsAscii checks if a string contains only ASCII characters
func IsAscii(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] > 127 {
			return false
		}
	}
	return true
}

// SplitValues parses comma, semicolon, or pipe separated strings into a slice of trimmed strings
func SplitValues(input string) []string {
	if strings.TrimSpace(input) == "" {
		return nil
	}
	parts := strings.FieldsFunc(input, func(r rune) bool {
		return r == ',' || r == ';' || r == '|'
	})
	var res []string
	for _, p := range parts {
		if tr := strings.TrimSpace(p); tr != "" {
			res = append(res, tr)
		}
	}
	if len(res) == 0 && strings.TrimSpace(input) != "" {
		return []string{strings.TrimSpace(input)}
	}
	return res
}

// BuildColExpr constructs a Bravo AST LIKE expression with LATIN1_GENERAL_CI_AI or Unicode collation
func BuildColExpr(fieldName, rawVal string) map[string]interface{} {
	val := strings.TrimSpace(rawVal)
	if val == "" {
		return nil
	}

	fieldNullWrap := map[string]interface{}{
		"opr": 35,
		"val": nil,
		"eps": []interface{}{
			map[string]interface{}{
				"opr": 11,
				"eps": []interface{}{
					map[string]interface{}{"opr": 4, "val": fieldName},
					map[string]interface{}{"opr": 4, "val": "''"},
				},
			},
		},
	}

	if IsAscii(val) {
		valPattern := fmt.Sprintf("'%%%s%%'", val)
		likeExpr := map[string]interface{}{
			"opr": 25,
			"eps": []interface{}{
				fieldNullWrap,
				map[string]interface{}{"opr": 4, "val": valPattern},
			},
		}
		return map[string]interface{}{
			"opr": 175,
			"eps": []interface{}{
				likeExpr,
				map[string]interface{}{"opr": 4, "val": "LATIN1_GENERAL_CI_AI"},
			},
		}
	}

	// Non-ASCII (Vietnamese Unicode)
	valPattern := fmt.Sprintf("N'%%%s%%'", val)
	return map[string]interface{}{
		"opr": 25,
		"eps": []interface{}{
			fieldNullWrap,
			map[string]interface{}{"opr": 4, "val": valPattern},
		},
	}
}

// CombineOr combines multiple Bravo AST expressions with OR (opr: 24)
func CombineOr(exprs []map[string]interface{}) map[string]interface{} {
	var clean []map[string]interface{}
	for _, e := range exprs {
		if e != nil {
			clean = append(clean, e)
		}
	}
	if len(clean) == 0 {
		return nil
	}
	if len(clean) == 1 {
		return clean[0]
	}
	res := clean[0]
	for i := 1; i < len(clean); i++ {
		res = map[string]interface{}{
			"opr": 24,
			"eps": []interface{}{res, clean[i]},
		}
	}
	return res
}

// CombineAnd combines multiple Bravo AST expressions with AND (opr: 23)
func CombineAnd(exprs []map[string]interface{}) map[string]interface{} {
	var clean []map[string]interface{}
	for _, e := range exprs {
		if e != nil {
			clean = append(clean, e)
		}
	}
	if len(clean) == 0 {
		return nil
	}
	if len(clean) == 1 {
		return clean[0]
	}
	res := clean[0]
	for i := 1; i < len(clean); i++ {
		res = map[string]interface{}{
			"opr": 23,
			"eps": []interface{}{res, clean[i]},
		}
	}
	return res
}

// BuildNestedFcle dynamically creates the nested Bravo binary tree structure for field lists (fcle)
func BuildNestedFcle(fields []string) []map[string]interface{} {
	if len(fields) == 0 {
		return []map[string]interface{}{}
	}
	if len(fields) == 1 {
		return []map[string]interface{}{
			{"opr": 4, "val": fields[0]},
		}
	}

	// Base 2 elements
	var current interface{} = map[string]interface{}{
		"opr": 11,
		"eps": []interface{}{
			map[string]interface{}{"opr": 4, "val": fields[0]},
			map[string]interface{}{"opr": 4, "val": fields[1]},
		},
	}

	// Chain the rest
	for i := 2; i < len(fields); i++ {
		current = map[string]interface{}{
			"opr": 11,
			"eps": []interface{}{
				current,
				map[string]interface{}{"opr": 4, "val": fields[i]},
			},
		}
	}

	if m, ok := current.(map[string]interface{}); ok {
		return []map[string]interface{}{m}
	}
	return []map[string]interface{}{}
}
