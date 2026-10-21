package prod_stats_remark_type

import (
	"context"
	"gorm.io/gorm"
	models "service-datahub/models/report"
	"strings"
)

type VersionedDelete struct {
	IdSeq      string `json:"IdSeq"`
	RowVersion int64  `json:"RowVersion"`
}

func (s *ProdStatsRemarkTypeService) ProdStatsRemarkTypeD(ctx context.Context, ids []string) (int64, error) {
	refs := make([]VersionedDelete, len(ids))
	for i, id := range ids {
		refs[i] = VersionedDelete{IdSeq: id}
	}
	return s.deleteRemarkTypes(ctx, refs, false)
}

func (s *ProdStatsRemarkTypeService) ProdStatsRemarkTypeDVersioned(ctx context.Context, refs []VersionedDelete) (int64, error) {
	return s.deleteRemarkTypes(ctx, refs, true)
}

func (s *ProdStatsRemarkTypeService) deleteRemarkTypes(ctx context.Context, refs []VersionedDelete, requireVersion bool) (int64, error) {
	ids := make([]string, len(refs))
	for i := range refs {
		ids[i] = refs[i].IdSeq
	}
	if len(ids) == 0 || len(ids) > MaxBatchSize {
		return 0, invalid("Số IdSeq phải từ 1 đến 500")
	}
	seen := map[string]bool{}
	for i := range ids {
		ids[i] = strings.TrimSpace(ids[i])
		if !validID(ids[i]) || seen[ids[i]] {
			return 0, invalid("IdSeq phải là UUIDv7 chuẩn và không trùng")
		}
		refs[i].IdSeq = ids[i]
		if requireVersion && refs[i].RowVersion < 1 {
			return 0, invalid("RowVersion phải lớn hơn 0")
		}
		seen[ids[i]] = true
	}
	var deleted int64
	err := s.write(ctx, func(tx *gorm.DB) error {
		var used int64
		if err := tx.Table(`"_ERPProdStatsDetail"`).Where(`"RemarkTypeSeq" IN ?`, ids).Count(&used).Error; err != nil {
			return err
		}
		if used > 0 {
			return conflict("Phân loại đang được sử dụng; hãy ngừng sử dụng bằng IsActive=false")
		}
		// No FK or cascading delete: protect referenced types in the application.
		for _, ref := range refs {
			query := tx.Where(`"IdSeq" = ?`, ref.IdSeq)
			if requireVersion {
				query = query.Where(`"RowVersion" = ?`, ref.RowVersion)
			}
			res := query.Delete(&models.ERPProdStatsRemarkType{})
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return conflict("Dữ liệu đã được người khác cập nhật. Hãy truy vấn lại trước khi xóa: " + ref.IdSeq)
			}
			if res.RowsAffected != 1 {
				return conflict("IdSeq bị trùng trong DB")
			}
			deleted++
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return deleted, nil
}
