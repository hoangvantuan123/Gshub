package perm_field

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

// PermFieldsA - Thêm mới hàng loạt trường phân quyền dữ liệu (Batch Insert CTE O(1))
func (s *PermFieldsService) PermFieldsA(ctx context.Context, fields []domainRoles.ERPPermFields) ([]domainRoles.ERPPermFields, error) {
	if len(fields) == 0 {
		return []domainRoles.ERPPermFields{}, nil
	}

	maxLimit := s.GetMaxBatchSaveLimit()
	if maxLimit > 0 && len(fields) > maxLimit {
		return nil, fmt.Errorf("số lượng bản ghi thêm mới vượt quá giới hạn cho phép (tối đa %d dòng một lần)", maxLimit)
	}

	var errorDetails []domainSys.RowErrorDetail
	codeTracker := make(map[string]int)
	combos := make([]string, 0, len(fields))

	for i, f := range fields {
		rowNum := i + 1
		resourceSeq := ""
		if f.ResourceSeq != nil {
			resourceSeq = strings.TrimSpace(*f.ResourceSeq)
		}
		resourceCode := ""
		if f.ResourceCode != nil {
			resourceCode = strings.TrimSpace(*f.ResourceCode)
		}
		fieldCode := ""
		if f.FieldCode != nil {
			fieldCode = strings.TrimSpace(*f.FieldCode)
		}
		fieldName := ""
		if f.FieldName != nil {
			fieldName = strings.TrimSpace(*f.FieldName)
		}

		if resourceSeq == "" && resourceCode == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     fieldCode,
				Field:   "ResourceSeq",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Chức năng / Menu (ResourceSeq) không được để trống", rowNum),
			})
		}

		if fieldCode == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     fieldCode,
				Field:   "FieldCode",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Mã trường (FieldCode) không được để trống", rowNum),
			})
		}

		checkKey := resourceSeq
		if checkKey == "" {
			checkKey = resourceCode
		}

		if checkKey != "" && fieldCode != "" {
			comboKey := strings.ToUpper(checkKey) + ":::" + strings.ToUpper(fieldCode)
			if firstRow, exists := codeTracker[comboKey]; exists {
				errorDetails = append(errorDetails, domainSys.RowErrorDetail{
					IdxNo:   rowNum,
					Key:     fieldCode,
					Field:   "FieldCode",
					Type:    "DUPLICATE",
					Message: fmt.Sprintf("Dòng %d: Trường '%s' trong chức năng '%s' bị trùng với dòng %d trong mảng thêm mới", rowNum, fieldCode, checkKey, firstRow),
				})
			} else {
				codeTracker[comboKey] = rowNum
				combos = append(combos, comboKey)
			}
		}

		if fieldName == "" {
			errorDetails = append(errorDetails, domainSys.RowErrorDetail{
				IdxNo:   rowNum,
				Key:     fieldCode,
				Field:   "FieldName",
				Type:    "REQUIRED",
				Message: fmt.Sprintf("Dòng %d: Tên trường (FieldName) không được để trống", rowNum),
			})
		}
	}

	if len(errorDetails) > 0 {
		return nil, &domainSys.BatchSaveError{
			Message: fmt.Sprintf("Có %d lỗi dữ liệu không hợp lệ", len(errorDetails)),
			Details: errorDetails,
		}
	}

	// Tự động phân giải ResourceSeq nếu chỉ có ResourceCode
	codesToLookup := make([]string, 0)
	for _, f := range fields {
		if (f.ResourceSeq == nil || strings.TrimSpace(*f.ResourceSeq) == "") && f.ResourceCode != nil && strings.TrimSpace(*f.ResourceCode) != "" {
			codesToLookup = append(codesToLookup, strings.ToUpper(strings.TrimSpace(*f.ResourceCode)))
		}
	}
	if len(codesToLookup) > 0 {
		type MenuLookup struct {
			Id  string `db:"Id"`
			Key string `db:"Key"`
		}
		var menus []MenuLookup
		lookupQuery := `SELECT CAST("Id" AS VARCHAR) AS "Id", UPPER("Key") AS "Key" FROM "_ERPMenus" WHERE UPPER("Key") = ANY($1)`
		if err := s.db.SelectContext(ctx, &menus, lookupQuery, pq.Array(codesToLookup)); err == nil {
			menuMap := make(map[string]string)
			for _, m := range menus {
				menuMap[m.Key] = m.Id
			}
			for i := range fields {
				if (fields[i].ResourceSeq == nil || strings.TrimSpace(*fields[i].ResourceSeq) == "") && fields[i].ResourceCode != nil {
					keyUpper := strings.ToUpper(strings.TrimSpace(*fields[i].ResourceCode))
					if seq, ok := menuMap[keyUpper]; ok {
						fields[i].ResourceSeq = &seq
					}
				}
			}
		}
	}

	// Kiểm tra trùng lặp trong DB
	if len(combos) > 0 {
		var existingCombos []string
		checkQuery := `
			SELECT (UPPER("ResourceSeq") || ':::' || UPPER("FieldCode"))
			FROM "_ERPPermFields" 
			WHERE (UPPER("ResourceSeq") || ':::' || UPPER("FieldCode")) = ANY($1)`
		err := s.db.SelectContext(ctx, &existingCombos, checkQuery, pq.Array(combos))
		if err != nil {
			return nil, fmt.Errorf("lỗi kiểm tra trùng ResourceSeq và FieldCode trong cơ sở dữ liệu: %w", err)
		}
		if len(existingCombos) > 0 {
			for _, exist := range existingCombos {
				if rowIdx, ok := codeTracker[exist]; ok {
					parts := strings.Split(exist, ":::")
					fc := exist
					if len(parts) == 2 {
						fc = parts[1]
					}
					errorDetails = append(errorDetails, domainSys.RowErrorDetail{
						IdxNo:   rowIdx,
						Key:     fc,
						Field:   "FieldCode",
						Type:    "EXISTS_IN_DB",
						Message: fmt.Sprintf("Dòng %d: Trường '%s' đã tồn tại trong chức năng được chọn", rowIdx, fc),
					})
				}
			}
			return nil, &domainSys.BatchSaveError{
				Message: fmt.Sprintf("Có %d trường dữ liệu đã tồn tại trên cơ sở dữ liệu", len(errorDetails)),
				Details: errorDetails,
			}
		}
	}

	// Chuẩn bị mảng Batch Insert (KHÔNG LƯU CỘT ResourceCode)
	n := len(fields)
	idSeqs := make([]string, n)
	resourceSeqs := make([]string, n)
	fieldCodes := make([]string, n)
	fieldNames := make([]string, n)
	dictSeqs := make([]*int64, n)
	langKeys := make([]*string, n)
	isMaskables := make([]bool, n)
	isSensitives := make([]bool, n)
	orderNos := make([]int, n)
	comments := make([]*string, n)
	idxNos := make([]*int, n)
	createdBys := make([]*string, n)
	updatedBys := make([]*string, n)

	for i, f := range fields {
		idSeqs[i] = uuid.New().String()
		if f.ResourceSeq != nil {
			resourceSeqs[i] = strings.TrimSpace(*f.ResourceSeq)
		}
		if f.FieldCode != nil {
			fieldCodes[i] = strings.TrimSpace(*f.FieldCode)
		}
		if f.FieldName != nil {
			fieldNames[i] = strings.TrimSpace(*f.FieldName)
		}
		dictSeqs[i] = f.DictSeq
		langKeys[i] = f.LangKey
		isMaskables[i] = f.IsMaskable
		isSensitives[i] = f.IsSensitive
		orderNos[i] = f.OrderNo
		comments[i] = f.Comment
		idxNos[i] = f.IdxNo
		createdBys[i] = f.CreatedBy
		updatedBys[i] = f.UpdatedBy
	}

	query := `
		WITH data AS (
			SELECT
				UNNEST($1::VARCHAR[]) AS "IdSeq",
				UNNEST($2::VARCHAR[]) AS "ResourceSeq",
				UNNEST($3::VARCHAR[]) AS "FieldCode",
				UNNEST($4::VARCHAR[]) AS "FieldName",
				UNNEST($5::BIGINT[]) AS "DictSeq",
				UNNEST($6::VARCHAR[]) AS "LangKey",
				UNNEST($7::BOOLEAN[]) AS "IsMaskable",
				UNNEST($8::BOOLEAN[]) AS "IsSensitive",
				UNNEST($9::INTEGER[]) AS "OrderNo",
				UNNEST($10::TEXT[]) AS "Comment",
				UNNEST($11::INTEGER[]) AS "IdxNo",
				UNNEST($12::VARCHAR[]) AS "CreatedBy",
				UNNEST($13::VARCHAR[]) AS "UpdatedBy"
		),
		inserted AS (
			INSERT INTO "_ERPPermFields" (
				"IdSeq",
				"ResourceSeq",
				"FieldCode",
				"FieldName",
				"DictSeq",
				"LangKey",
				"IsMaskable",
				"IsSensitive",
				"OrderNo",
				"Comment",
				"RowVersion",
				"IdxNo",
				"CreatedBy",
				"CreatedAt",
				"UpdatedBy",
				"UpdatedAt"
			)
			SELECT
				d."IdSeq",
				d."ResourceSeq",
				d."FieldCode",
				d."FieldName",
				d."DictSeq",
				d."LangKey",
				d."IsMaskable",
				d."IsSensitive",
				d."OrderNo",
				d."Comment",
				1,
				d."IdxNo",
				d."CreatedBy",
				NOW(),
				d."UpdatedBy",
				NOW()
			FROM data d
			RETURNING
				"IdSeq",
				"ResourceSeq",
				"FieldCode",
				"FieldName",
				"DictSeq",
				"LangKey",
				"IsMaskable",
				"IsSensitive",
				"OrderNo",
				"Comment",
				"RowVersion",
				"IdxNo",
				"CreatedBy",
				"CreatedAt",
				"UpdatedBy",
				"UpdatedAt"
		)
		SELECT
			ins."IdSeq",
			ins."ResourceSeq",
			COALESCE(sm."Key", '') AS "ResourceCode",
			COALESCE(sm."Label", '') AS "ResourceName",
			ins."FieldCode",
			ins."FieldName",
			ins."DictSeq",
			ins."LangKey",
			ins."IsMaskable",
			ins."IsSensitive",
			ins."OrderNo",
			ins."Comment",
			ins."RowVersion",
			ins."IdxNo",
			ins."CreatedBy",
			COALESCE(uc."UserName", uc."UserId", CAST(ins."CreatedBy" AS VARCHAR), '') AS "CreatedByName",
			ins."CreatedAt",
			ins."UpdatedBy",
			COALESCE(uu."UserName", uu."UserId", CAST(ins."UpdatedBy" AS VARCHAR), '') AS "UpdatedByName",
			ins."UpdatedAt"
		FROM inserted ins
		LEFT JOIN "_ERPMenus" sm ON CAST(ins."ResourceSeq" AS VARCHAR) = CAST(sm."Id" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uc ON CAST(ins."CreatedBy" AS VARCHAR) = CAST(uc."UserSeq" AS VARCHAR) OR CAST(ins."CreatedBy" AS VARCHAR) = CAST(uc."UserId" AS VARCHAR)
		LEFT JOIN "_ERPUsers" uu ON CAST(ins."UpdatedBy" AS VARCHAR) = CAST(uu."UserSeq" AS VARCHAR) OR CAST(ins."UpdatedBy" AS VARCHAR) = CAST(uu."UserId" AS VARCHAR)
		ORDER BY ins."IdxNo" ASC NULLS LAST
	`

	result := make([]domainRoles.ERPPermFields, 0)
	err := s.db.SelectContext(
		ctx,
		&result,
		query,
		pq.Array(idSeqs),
		pq.Array(resourceSeqs),
		pq.Array(fieldCodes),
		pq.Array(fieldNames),
		pq.Array(dictSeqs),
		pq.Array(langKeys),
		pq.Array(isMaskables),
		pq.Array(isSensitives),
		pq.Array(orderNos),
		pq.Array(comments),
		pq.Array(idxNos),
		pq.Array(createdBys),
		pq.Array(updatedBys),
	)

	if err != nil {
		if s.log != nil {
			s.log.Error("[PermFieldsA] Batch insert CTE failed", zap.Error(err))
		}
		return nil, fmt.Errorf("thêm mới danh sách trường phân quyền thất bại: %w", err)
	}

	s.totalAllCount.Add(int64(len(result)))
	s.PublishKafkaEvent("PERM_FIELDS_A", result)

	return result, nil
}
