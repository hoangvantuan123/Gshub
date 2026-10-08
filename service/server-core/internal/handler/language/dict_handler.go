package language

import (
	"context"
	"strconv"

	domain "server-core/internal/models/language"
	"server-core/internal/service/language/dict"
	"server-core/internal/utils"
	pb "server-core/proto/users/langs/dicts"

	"go.uber.org/zap"
)

type DictHandler struct {
	pb.UnimplementedDictsServiceServer
	dictSvc *dict.DictService
	log     *zap.Logger
}

func NewDictHandler(dictSvc *dict.DictService, log *zap.Logger) *DictHandler {
	return &DictHandler{
		dictSvc: dictSvc,
		log:     log,
	}
}

func (h *DictHandler) DictA(ctx context.Context, req *pb.DictARequest) (*pb.Response, error) {
	var words []domain.ERPDictionary
	for _, item := range req.Result {
		idxNo := int(item.IdxNo)
		langSeq := int(item.LanguageSeq)
		word := item.Word
		createdBy := item.CreatedBy
		wSeq := int(item.WordSeq)

		words = append(words, domain.ERPDictionary{
			IdxNo:       &idxNo,
			LanguageSeq: &langSeq,
			Word:        &word,
			CreatedBy:   &createdBy,
			WordSeq:     &wSeq,
		})
	}

	data, err := h.dictSvc.DictA(ctx, words)
	if err != nil {
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}

func (h *DictHandler) DictU(ctx context.Context, req *pb.DictURequest) (*pb.Response, error) {
	var words []domain.ERPDictionary
	for _, item := range req.Result {
		idSeq := item.IdSeq
		idxNo := int(item.IdxNo)
		langSeq := int(item.LanguageSeq)
		word := item.Word
		updatedBy := item.UpdatedBy
		wSeq := int(item.WordSeq)

		words = append(words, domain.ERPDictionary{
			IdSeq:       idSeq,
			IdxNo:       &idxNo,
			LanguageSeq: &langSeq,
			Word:        &word,
			UpdatedBy:   &updatedBy,
			WordSeq:     &wSeq,
		})
	}

	data, err := h.dictSvc.DictU(ctx, words)
	if err != nil {
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}

func (h *DictHandler) DictD(ctx context.Context, req *pb.DictDRequest) (*pb.Response, error) {
	var ids []string
	for _, item := range req.Result {
		if item.IdSeq != "" {
			ids = append(ids, item.IdSeq)
		}
	}

	data, err := h.dictSvc.DictD(ctx, ids)
	if err != nil {
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}

func (h *DictHandler) DictQ(ctx context.Context, req *pb.DictQRequest) (*pb.Response, error) {
	opts := dict.DictQueryOptions{}
	if req.Result != nil {
		opts.LanguageSeq = int(req.Result.KeyItem1)
		opts.Word = req.Result.KeyItem2
		opts.KeyItem3 = req.Result.KeyItem3
	}

	data, err := h.dictSvc.DictQ(ctx, opts)
	if err != nil {
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}

func (h *DictHandler) DictVersionQ(ctx context.Context, req *pb.DictQRequest) (*pb.Response, error) {
	langSeq := 0
	langCode := ""
	if req.Result != nil {
		langSeq = int(req.Result.KeyItem1)
		if langSeq == 0 && req.Result.KeyItem2 != "" {
			if s, err := strconv.Atoi(req.Result.KeyItem2); err == nil {
				langSeq = s
			} else {
				langCode = req.Result.KeyItem2
			}
		}
		if langCode == "" && req.Result.KeyItem3 != "" {
			langCode = req.Result.KeyItem3
		}
	}

	data, err := h.dictSvc.GetDictVersion(ctx, langSeq, langCode)
	if err != nil {
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}
