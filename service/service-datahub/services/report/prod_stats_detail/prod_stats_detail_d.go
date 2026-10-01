package prod_stats_detail

import (
	"context"
	"errors"

	models "service-datahub/models/report"
)

// ProdStatsDetailD - Xóa danh sách dòng chi tiết Thống Kê Sản Xuất
func (s *ProdStatsDetailService) ProdStatsDetailD(
	ctx context.Context,
	detailSeqs []string,
	userId string,
) error {
	if len(detailSeqs) == 0 {
		return errors.New("danh sách IdSeq Detail TKSX cần xóa rỗng")
	}

	return s.db.WithContext(ctx).Where(`"IdSeq" IN ?`, detailSeqs).Delete(&models.ERPProdStatsDetail{}).Error
}
