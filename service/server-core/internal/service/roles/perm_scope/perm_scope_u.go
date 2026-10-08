package perm_scope

import (
	"context"
	"fmt"
	"sort"
	"strings"

	domainRoles "server-core/internal/models/roles"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// PermScopesU - Cập nhật hàng loạt quy tắc phạm vi quyền hạn (Batch Update CTE O(1))
func (s *PermScopesService) PermScopesU(ctx context.Context, scopes []domainRoles.ERPPermScopes) ([]domainRoles.ERPPermScopes, error) {
	if len(scopes) == 0 {
		return []domainRoles.ERPPermScopes{}, nil
	}

	// 1. Sắp xếp danh sách theo IdSeq tăng dần để tránh DEADLOCK
	sort.Slice(scopes, func(i, j int) bool {
		return scopes[i].IdSeq < scopes[j].IdSeq
	})

	idSeqs := make([]string, 0, len(scopes))
	for _, sc := range scopes {
		if strings.TrimSpace(sc.IdSeq) != "" {
			idSeqs = append(idSeqs, strings.TrimSpace(sc.IdSeq))
		}
	}

	if len(idSeqs) == 0 {
		return nil, fmt.Errorf("IdSeq không được để trống khi cập nhật")
	}

	// 2. Kiểm tra xung đột dữ liệu đồng thời (Optimistic Concurrency Control - OCC RowVersion)
	type CurrentRecord struct {
		IdSeq      string `db:"IdSeq"`
		RowVersion int64  `db:"RowVersion"`
	}
	var currentList []CurrentRecord
	checkQuery := `SELECT "IdSeq", "RowVersion" FROM "_ERPPermScopes" WHERE "IdSeq" = ANY($1)`
	err := s.db.SelectContext(ctx, &currentList, checkQuery, pq.Array(idSeqs))
	if err != nil {
		return nil, fmt.Errorf("failed to fetch current records for OCC check: %w", err)
	}

	currentMap := make(map[string]int64, len(currentList))
	for _, cur := range currentList {
		currentMap[cur.IdSeq] = cur.RowVersion
	}

	for _, sc := range scopes {
		dbVer, exists := currentMap[sc.IdSeq]
		if !exists {
			return nil, fmt.Errorf("bản ghi với IdSeq %s không tồn tại trong hệ thống", sc.IdSeq)
		}
		if sc.RowVersion != 0 && sc.RowVersion != dbVer {
			return nil, fmt.Errorf("dữ liệu đã bị thay đổi bởi người dùng khác (RowVersion conflict on %s). Vui lòng tải lại trang!", sc.IdSeq)
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
	arrUpdatedBy := make([]string, n)

	for i, item := range scopes {
		arrIdSeqs[i] = strings.TrimSpace(item.IdSeq)
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
		arrRowVersions[i] = item.RowVersion
		if item.IdxNo != nil {
			arrIdxNos[i] = *item.IdxNo
		} else {
			arrIdxNos[i] = i + 1
		}
		if item.UpdatedBy != nil {
			arrUpdatedBy[i] = strings.TrimSpace(*item.UpdatedBy)
		}
	}

	query := `
	WITH updated AS (
		UPDATE "_ERPPermScopes" AS a
		SET
			"ScopeCode" = CASE WHEN u.scope_code <> '' THEN u.scope_code ELSE a."ScopeCode" END,
			"ScopeName" = CASE WHEN u.scope_name <> '' THEN u.scope_name ELSE a."ScopeName" END,
			"LangKey" = NULLIF(u.lang_key, ''),
			"PermActionSeq" = NULLIF(u.perm_action_seq, ''),
			"ScopeLevelSeq" = NULLIF(u.scope_level_seq, ''),
			"RuleConditionSeq" = NULLIF(u.rule_condition_seq, ''),
			"ConditionSql" = NULLIF(u.condition_sql, ''),
			"Comment" = NULLIF(u.comment, ''),
			"IdxNo" = u.idx_no,
			"RowVersion" = a."RowVersion" + 1,
			"UpdatedBy" = NULLIF(u.updated_by, ''),
			"UpdatedAt" = NOW()
		FROM UNNEST(
			$1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[],
			$5::varchar[], $6::varchar[], $7::varchar[], $8::text[],
			$9::text[], $10::bigint[], $11::int[], $12::varchar[]
		) AS u(
			id_seq, scope_code, scope_name, lang_key,
			perm_action_seq, scope_level_seq, rule_condition_seq, condition_sql,
			comment, row_version, idx_no, updated_by
		)
		WHERE a."IdSeq" = u.id_seq
		RETURNING 
			a."IdSeq", a."ScopeCode", a."ScopeName", a."LangKey",
			a."PermActionSeq", a."ScopeLevelSeq", a."RuleConditionSeq", a."ConditionSql",
			a."Comment", a."RowVersion", a."IdxNo", a."CreatedBy", a."CreatedAt", a."UpdatedBy", a."UpdatedAt"
	)
	SELECT 
		up."IdSeq", up."ScopeCode", up."ScopeName", up."LangKey",
		up."PermActionSeq",
		COALESCE(act."ActionCode", '') AS "OperationCode",
		COALESCE(act."ActionName", '') AS "OperationName",
		up."ScopeLevelSeq",
		COALESCE(sl."AttrValueCode", '') AS "DefaultScopeLevel",
		COALESCE(sl."AttrValueName", '') AS "DefaultScopeLevelLabel",
		up."RuleConditionSeq",
		COALESCE(rc."AttrValueCode", '') AS "RuleCondition",
		COALESCE(rc."AttrValueName", '') AS "RuleConditionLabel",
		up."ConditionSql",
		up."Comment", up."RowVersion", up."IdxNo",
		up."CreatedBy",
		COALESCE(CAST(uc."UserName" AS VARCHAR), CAST(uc."UserId" AS VARCHAR), CAST(up."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
		up."CreatedAt",
		up."UpdatedBy",
		COALESCE(CAST(uu."UserName" AS VARCHAR), CAST(uu."UserId" AS VARCHAR), CAST(up."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
		up."UpdatedAt"
	FROM updated up
	LEFT JOIN "_ERPPermActions" act ON CAST(up."PermActionSeq" AS VARCHAR) = CAST(act."IdSeq" AS VARCHAR)
	LEFT JOIN "_ERPSysAttrItems" sl ON CAST(up."ScopeLevelSeq" AS VARCHAR) = CAST(sl."IdSeq" AS VARCHAR)
	LEFT JOIN "_ERPSysAttrItems" rc ON CAST(up."RuleConditionSeq" AS VARCHAR) = CAST(rc."IdSeq" AS VARCHAR)
	LEFT JOIN "_ERPUsers" uc ON CAST(up."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(up."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
	LEFT JOIN "_ERPUsers" uu ON CAST(up."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(up."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
	ORDER BY up."IdxNo" ASC;
	`

	result := make([]domainRoles.ERPPermScopes, 0)
	err = s.db.SelectContext(ctx, &result, query,
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
		pq.Array(arrUpdatedBy),
	)
	if err != nil {
		if s.log != nil {
			s.log.Error("[PermScopesU] Batch update CTE failed", zap.Error(err))
		}
		return nil, fmt.Errorf("failed to bulk update perm scopes: %w", err)
	}

	s.PublishKafkaEvent("PERM_SCOPES_UPDATED", result)

	return result, nil
}

