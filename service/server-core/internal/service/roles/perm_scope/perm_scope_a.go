package perm_scope

import (
	"context"
	"fmt"
	"strings"

	domainRoles "server-core/internal/models/roles"
	domainSys "server-core/internal/models/system"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"go.uber.org/zap"
)

// PermScopesA - Thêm mới hàng loạt quy tắc phạm vi quyền hạn (Batch Insert CTE O(1))
func (s *PermScopesService) PermScopesA(ctx context.Context, scopes []domainRoles.ERPPermScopes) ([]domainRoles.ERPPermScopes, error) {
	if len(scopes) == 0 {
		return []domainRoles.ERPPermScopes{}, nil
	}

	maxLimit := s.GetMaxBatchSaveLimit()
	if maxLimit > 0 && len(scopes) > maxLimit {
		return nil, fmt.Errorf("số lượng bản ghi thêm mới vượt quá giới hạn cho phép (tối đa %d dòng một lần)", maxLimit)
	}

	var errorDetails []domainSys.RowErrorDetail
	codeTracker := make(map[string]int)
	codes := make([]string, 0, len(scopes))

	for i, sc := range scopes {
		rowNum := i + 1
		scopeCode := ""
		if sc.ScopeCode != nil {
			scopeCode = strings.TrimSpace(*sc.ScopeCode)
		}
		scopeName := ""
		if sc.ScopeName != nil {
			scopeName = strings.TrimSpace(*sc.ScopeName)
		}

		if scopeCode == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     scopeCode,
				Field:   "ScopeCode",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã quy tắc phạm vi (ScopeCode) không được để trống", rowNum),
			})
		} else {
			codeClean := strings.ToUpper(scopeCode)
			if firstRow, exists := codeTracker[codeClean]; exists {
				errorDetails = append(errorDetails, domainSys.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     scopeCode,
					Field:   "ScopeCode",
					Type:    "DUPLICATE",
					Message: fmt.Sprintf("Dòng %d: Mã quy tắc phạm vi '%s' bị trùng với dòng %d trong mảng thêm mới", rowNum, scopeCode, firstRow),
				})
			} else {
				codeTracker[codeClean] = rowNum
				codes = append(codes, scopeCode)
			}
		}

		if scopeName == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     scopeCode,
				Field:   "ScopeName",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Tên quy tắc phạm vi (ScopeName) không được để trống", rowNum),
			})
		}
	}

	if len(errorDetails) > 0 {
		return nil, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	if len(codes) > 0 {
		var existingCodes []string
		checkQuery := `SELECT "ScopeCode" FROM "_ERPPermScopes" WHERE UPPER("ScopeCode") = ANY($1)`
		upperCodes := make([]string, len(codes))
		for i, c := range codes {
			upperCodes[i] = strings.ToUpper(c)
		}
		err := s.db.SelectContext(ctx, &existingCodes, checkQuery, pq.Array(upperCodes))
		if err != nil {
			return nil, fmt.Errorf("lỗi kiểm tra trùng ScopeCode trong cơ sở dữ liệu: %w", err)
		}
		if len(existingCodes) > 0 {
			for _, exist := range existingCodes {
				existUpper := strings.ToUpper(exist)
				if rowIdx, ok := codeTracker[existUpper]; ok {
					errorDetails = append(errorDetails, domainSys.RowErrorDetail{
						IdxNo:   rowIdx,
						Key:     exist,
						Field:   "ScopeCode",
						Type:    "ALREADY_EXISTS",
						Message: fmt.Sprintf("Dòng %d: Mã quy tắc phạm vi '%s' đã tồn tại trong hệ thống", rowIdx, exist),
					})
				}
			}
			return nil, &domainSys.BatchSaveError{
				Message: "Phát hiện mã quy tắc phạm vi đã tồn tại trong CSDL",
				Details: errorDetails,
			}
		}
	}

	n := len(scopes)
	arrIdSeqs := make([]string, n)
	arrScopeCodes := make([]string, n)
	arrScopeNames := make([]string, n)
	arrLangKeys := make([]string, n)
	arrPermActionSeqs := make([]string, n)
	arrScopeLevelSeqs := make([]string, n)
	arrRuleConditionSeqs := make([]string, n)
	arrConditionSqls := make([]string, n)
	arrComments := make([]string, n)
	arrRowVersions := make([]int64, n)
	arrIdxNos := make([]int, n)
	arrCreatedBy := make([]string, n)
	arrUpdatedBy := make([]string, n)

	for i, item := range scopes {
		if item.IdSeq != "" {
			arrIdSeqs[i] = item.IdSeq
		} else {
			arrIdSeqs[i] = uuid.New().String()
		}

		if item.ScopeCode != nil {
			arrScopeCodes[i] = strings.TrimSpace(*item.ScopeCode)
		}
		if item.ScopeName != nil {
			arrScopeNames[i] = strings.TrimSpace(*item.ScopeName)
		}
		if item.LangKey != nil {
			arrLangKeys[i] = strings.TrimSpace(*item.LangKey)
		}
		if item.PermActionSeq != nil {
			arrPermActionSeqs[i] = strings.TrimSpace(*item.PermActionSeq)
		}
		if item.ScopeLevelSeq != nil {
			arrScopeLevelSeqs[i] = strings.TrimSpace(*item.ScopeLevelSeq)
		}
		if item.RuleConditionSeq != nil {
			arrRuleConditionSeqs[i] = strings.TrimSpace(*item.RuleConditionSeq)
		}
		if item.ConditionSql != nil {
			arrConditionSqls[i] = strings.TrimSpace(*item.ConditionSql)
		}
		if item.Comment != nil {
			arrComments[i] = strings.TrimSpace(*item.Comment)
		}
		arrRowVersions[i] = 1
		if item.IdxNo != nil {
			arrIdxNos[i] = *item.IdxNo
		} else {
			arrIdxNos[i] = i + 1
		}
		if item.CreatedBy != nil {
			arrCreatedBy[i] = strings.TrimSpace(*item.CreatedBy)
		}
		if item.UpdatedBy != nil {
			arrUpdatedBy[i] = strings.TrimSpace(*item.UpdatedBy)
		} else if item.CreatedBy != nil {
			arrUpdatedBy[i] = strings.TrimSpace(*item.CreatedBy)
		}
	}

	query := `
	WITH inserted AS (
		INSERT INTO "_ERPPermScopes" (
			"IdSeq", "ScopeCode", "ScopeName", "LangKey", 
			"PermActionSeq", "ScopeLevelSeq", "RuleConditionSeq", "ConditionSql",
			"Comment", "RowVersion", "IdxNo", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt"
		)
		SELECT 
			u.id_seq, u.scope_code, u.scope_name, NULLIF(u.lang_key, ''),
			NULLIF(u.perm_action_seq, ''), NULLIF(u.scope_level_seq, ''), NULLIF(u.rule_condition_seq, ''), NULLIF(u.condition_sql, ''),
			NULLIF(u.comment, ''), u.row_version, u.idx_no, NULLIF(u.created_by, ''), NOW(), NULLIF(u.updated_by, ''), NOW()
		FROM UNNEST(
			$1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[],
			$5::varchar[], $6::varchar[], $7::varchar[], $8::text[],
			$9::text[], $10::bigint[], $11::int[], $12::varchar[], $13::varchar[]
		) AS u(
			id_seq, scope_code, scope_name, lang_key,
			perm_action_seq, scope_level_seq, rule_condition_seq, condition_sql,
			comment, row_version, idx_no, created_by, updated_by
		)
		RETURNING 
			"IdSeq", "ScopeCode", "ScopeName", "LangKey",
			"PermActionSeq", "ScopeLevelSeq", "RuleConditionSeq", "ConditionSql",
			"Comment", "RowVersion", "IdxNo", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt"
	)
	SELECT 
		ins."IdSeq", ins."ScopeCode", ins."ScopeName", ins."LangKey",
		ins."PermActionSeq",
		COALESCE(act."ActionCode", '') AS "OperationCode",
		COALESCE(act."ActionName", '') AS "OperationName",
		ins."ScopeLevelSeq",
		COALESCE(sl."AttrValueCode", '') AS "DefaultScopeLevel",
		COALESCE(sl."AttrValueName", '') AS "DefaultScopeLevelLabel",
		ins."RuleConditionSeq",
		COALESCE(rc."AttrValueCode", '') AS "RuleCondition",
		COALESCE(rc."AttrValueName", '') AS "RuleConditionLabel",
		ins."ConditionSql",
		ins."Comment", ins."RowVersion", ins."IdxNo", 
		ins."CreatedBy",
		COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(ins."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
		ins."CreatedAt",
		ins."UpdatedBy",
		COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(ins."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
		ins."UpdatedAt"
	FROM inserted ins
	LEFT JOIN "_ERPPermActions" act ON CAST(ins."PermActionSeq" AS VARCHAR) = CAST(act."IdSeq" AS VARCHAR)
	LEFT JOIN "_ERPSysAttrItems" sl ON CAST(ins."ScopeLevelSeq" AS VARCHAR) = CAST(sl."IdSeq" AS VARCHAR)
	LEFT JOIN "_ERPSysAttrItems" rc ON CAST(ins."RuleConditionSeq" AS VARCHAR) = CAST(rc."IdSeq" AS VARCHAR)
	LEFT JOIN "_ERPUsers" uc ON CAST(ins."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(ins."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
	LEFT JOIN "_ERPUsers" uu ON CAST(ins."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(ins."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
	ORDER BY ins."IdxNo" ASC;
	`

	result := make([]domainRoles.ERPPermScopes, 0)
	err := s.db.SelectContext(ctx, &result, query,
		pq.Array(arrIdSeqs),
		pq.Array(arrScopeCodes),
		pq.Array(arrScopeNames),
		pq.Array(arrLangKeys),
		pq.Array(arrPermActionSeqs),
		pq.Array(arrScopeLevelSeqs),
		pq.Array(arrRuleConditionSeqs),
		pq.Array(arrConditionSqls),
		pq.Array(arrComments),
		pq.Array(arrRowVersions),
		pq.Array(arrIdxNos),
		pq.Array(arrCreatedBy),
		pq.Array(arrUpdatedBy),
	)
	if err != nil {
		if s.log != nil {
			s.log.Error("[PermScopesA] Batch insert CTE failed", zap.Error(err))
		}
		return nil, fmt.Errorf("failed to bulk insert perm scopes: %w", err)
	}

	s.totalAllCount.Add(int64(len(result)))
	s.PublishKafkaEvent("PERM_SCOPES_CREATED", result)

	return result, nil
}
