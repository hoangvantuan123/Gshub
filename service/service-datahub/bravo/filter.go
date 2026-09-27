package bravo

import (
	"fmt"
	"strings"
)

// BuildFieldOrFilter creates an OR-combined AST expression for a column across multiple target values
func BuildFieldOrFilter(fieldName string, rawValues ...string) map[string]interface{} {
	var vals []string
	for _, v := range rawValues {
		vals = append(vals, SplitValues(v)...)
	}
	if len(vals) == 0 {
		return nil
	}

	var orExprs []map[string]interface{}
	for _, v := range vals {
		if expr := BuildColExpr(fieldName, v); expr != nil {
			orExprs = append(orExprs, expr)
		}
	}
	return CombineOr(orExprs)
}

// BuildMultiColsOrFilter creates an OR-combined AST expression across multiple columns and multiple values
func BuildMultiColsOrFilter(columns []string, rawValues ...string) map[string]interface{} {
	var vals []string
	for _, v := range rawValues {
		vals = append(vals, SplitValues(v)...)
	}
	if len(vals) == 0 || len(columns) == 0 {
		return nil
	}

	var orExprs []map[string]interface{}
	for _, col := range columns {
		for _, v := range vals {
			if expr := BuildColExpr(col, v); expr != nil {
				orExprs = append(orExprs, expr)
			}
		}
	}
	return CombineOr(orExprs)
}

// MatchesRowField checks if any string in `targets` is contained in `row[fieldKey]` (case-insensitive)
func MatchesRowField(row map[string]interface{}, fieldKey string, rawTargets ...string) bool {
	var targets []string
	for _, t := range rawTargets {
		targets = append(targets, SplitValues(t)...)
	}
	if len(targets) == 0 {
		return true
	}

	val := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", row[fieldKey])))
	for _, t := range targets {
		tLower := strings.ToLower(strings.TrimSpace(t))
		if tLower != "" && strings.Contains(val, tLower) {
			return true
		}
	}
	return false
}

// MatchesAnyRowField checks if any target is contained in at least one of the candidate fields
func MatchesAnyRowField(row map[string]interface{}, fieldKeys []string, rawTargets ...string) bool {
	var targets []string
	for _, t := range rawTargets {
		targets = append(targets, SplitValues(t)...)
	}
	if len(targets) == 0 {
		return true
	}

	for _, k := range fieldKeys {
		val := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", row[k])))
		for _, t := range targets {
			tLower := strings.ToLower(strings.TrimSpace(t))
			if tLower != "" && strings.Contains(val, tLower) {
				return true
			}
		}
	}
	return false
}
