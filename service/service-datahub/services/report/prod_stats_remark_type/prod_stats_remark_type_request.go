package prod_stats_remark_type

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	models "service-datahub/models/report"
)

type Result struct {
	Success  bool                 `json:"success"`
	Data     interface{}          `json:"data"`
	PageInfo *models.PlanPageInfo `json:"pageInfo,omitempty"`
}

// Execute is shared by REST and gRPC so payload validation and audit identity agree.
func (s *ProdStatsRemarkTypeService) Execute(ctx context.Context, operation string, body []byte, userSeq string) (*Result, error) {
	result := &Result{Success: true}
	if operation == "Q" {
		filters := map[string]string{}
		if len(bytes.TrimSpace(body)) > 0 {
			var raw map[string]interface{}
			if err := json.Unmarshal(body, &raw); err != nil || raw == nil {
				return nil, invalid("Bộ lọc phải là JSON object")
			}
			delete(raw, "metadata")
			for _, wrapperKey := range []string{"filters", "params", "data", "filter"} {
				if sub, ok := raw[wrapperKey].(map[string]interface{}); ok {
					for sk, sv := range sub {
						if sv != nil {
							switch val := sv.(type) {
							case string, float64, bool, int, int64:
								filters[sk] = fmt.Sprint(val)
							default:
								return nil, invalid("Giá trị bộ lọc không hợp lệ")
							}
						}
					}
					delete(raw, wrapperKey)
				}
			}
			for k, v := range raw {
				if strings.EqualFold(k, "metadata") {
					continue
				}
				if v != nil {
					switch val := v.(type) {
					case string, float64, bool, int, int64:
						filters[k] = fmt.Sprint(val)
					default:
						return nil, invalid("Giá trị bộ lọc không hợp lệ")
					}
				}
			}
		}
		rows, page, err := s.ProdStatsRemarkTypeQ(ctx, filters)
		if err != nil {
			return nil, err
		}
		result.Data, result.PageInfo = rows, page
		return result, nil
	}
	if userSeq == "" {
		return nil, &APIError{401, "Cần đăng nhập"}
	}
	if operation == "D" {
		var ids []string
		if err := json.Unmarshal(body, &ids); err == nil && len(ids) > 0 {
			count, err := s.ProdStatsRemarkTypeD(ctx, ids)
			if err != nil {
				return nil, err
			}
			result.Data = map[string]int64{"deletedCount": count}
			return result, nil
		}
		var wrapper struct {
			Items  []VersionedDelete `json:"items"`
			IdSeqs []string          `json:"idSeqs"`
		}
		if err := json.Unmarshal(body, &wrapper); err != nil {
			return nil, invalid("Dữ liệu xóa không hợp lệ")
		}
		var count int64
		var err error
		if len(wrapper.Items) > 0 {
			count, err = s.ProdStatsRemarkTypeDVersioned(ctx, wrapper.Items)
		} else {
			count, err = s.ProdStatsRemarkTypeD(ctx, wrapper.IdSeqs)
		}
		if err != nil {
			return nil, err
		}
		result.Data = map[string]int64{"deletedCount": count}
		return result, nil
	}
	var items []models.ERPProdStatsRemarkType
	if err := json.Unmarshal(body, &items); err != nil {
		var wrapper struct {
			Items []models.ERPProdStatsRemarkType `json:"items"`
			Data  []models.ERPProdStatsRemarkType `json:"data"`
		}
		if err := json.Unmarshal(body, &wrapper); err != nil {
			return nil, invalid("Danh sách phân loại không hợp lệ")
		}
		items = wrapper.Items
		if len(items) == 0 {
			items = wrapper.Data
		}
	}
	var err error
	switch operation {
	case "A":
		result.Data, err = s.ProdStatsRemarkTypeA(ctx, items, userSeq)
	case "U":
		result.Data, err = s.ProdStatsRemarkTypeU(ctx, items, userSeq)
	default:
		return nil, invalid("Thao tác không hợp lệ")
	}
	if err != nil {
		return nil, err
	}
	return result, nil
}
