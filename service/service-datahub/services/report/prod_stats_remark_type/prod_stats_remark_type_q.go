package prod_stats_remark_type

import (
	"context"
	models "service-datahub/models/report"
	"strconv"
	"strings"
)

func (s *ProdStatsRemarkTypeService) ProdStatsRemarkTypeQ(ctx context.Context, filters map[string]string) ([]models.ERPProdStatsRemarkType, *models.PlanPageInfo, error) {
	f := map[string]string{}
	for k, v := range filters {
		f[strings.ToLower(k)] = strings.TrimSpace(v)
	}
	page, size := 1, 100
	for key, dst := range map[string]*int{"page": &page, "pagesize": &size} {
		if f[key] != "" {
			n, err := strconv.Atoi(f[key])
			if err != nil || n < 1 || n > 1000000 {
				return nil, nil, invalid("Phân trang không hợp lệ")
			}
			*dst = n
		}
	}
	if size > 1000 {
		return nil, nil, invalid("pageSize tối đa 1000")
	}
	if id := f["idseq"]; id != "" && !validID(id) {
		return nil, nil, invalid("IdSeq không hợp lệ")
	}
	var active bool
	if val := f["isactive"]; val != "" {
		var err error
		active, err = strconv.ParseBool(val)
		if err != nil {
			return nil, nil, invalid("IsActive không hợp lệ")
		}
	}
	q := s.db.WithContext(ctx).Model(&models.ERPProdStatsRemarkType{})
	if id := f["idseq"]; id != "" {
		q = q.Where(`"IdSeq" = ?`, id)
	}
	for _, field := range []string{"TypeCode", "TypeName"} {
		if val := f[strings.ToLower(field)]; val != "" {
			q = q.Where(`"`+field+`" ILIKE ?`, "%"+val+"%")
		}
	}
	if val := f["keyword"]; val != "" {
		q = q.Where(`("TypeCode" ILIKE ? OR "TypeName" ILIKE ? OR "Description" ILIKE ?)`, "%"+val+"%", "%"+val+"%", "%"+val+"%")
	}
	if val := f["isactive"]; val != "" {
		q = q.Where(`"IsActive" = ?`, active)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}
	rows := make([]models.ERPProdStatsRemarkType, 0)
	if err := q.Order(`"IdxNo" ASC NULLS LAST, "TypeCode" ASC, "IdSeq" ASC`).Offset((page - 1) * size).Limit(size).Find(&rows).Error; err != nil {
		return nil, nil, err
	}
	return rows, &models.PlanPageInfo{Page: page, PageSize: size, Total: total, TotalRows: int(total), TotalPages: int((total + int64(size) - 1) / int64(size)), LoadedCount: len(rows), TotalColumns: 11}, nil
}
