package language

import (
	"context"

	domain "server-core/internal/models/language"
	"server-core/internal/service/language/lang"
	"server-core/internal/utils"
	pb "server-core/proto/users/langs/langs"

	"go.uber.org/zap"
)

type LangHandler struct {
	pb.UnimplementedLangsServiceServer
	langSvc *lang.LanguageService
	log     *zap.Logger
}

func NewLangHandler(langSvc *lang.LanguageService, log *zap.Logger) *LangHandler {
	return &LangHandler{
		langSvc: langSvc,
		log:     log,
	}
}

func (h *LangHandler) LangA(ctx context.Context, req *pb.LangARequest) (*pb.Response, error) {
	var langs []domain.ERPLanguage
	for _, item := range req.Result {
		idxNo := int(item.IdxNo)
		name := item.LanguageName
		code := item.LanguageCode
		remark := item.Remark
		createdBy := item.CreatedBy

		langs = append(langs, domain.ERPLanguage{
			IdxNo:        &idxNo,
			LanguageName: &name,
			LanguageCode: &code,
			Remark:       &remark,
			CreatedBy:    &createdBy,
		})
	}

	data, err := h.langSvc.LangA(ctx, langs)
	if err != nil {
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}

func (h *LangHandler) LangU(ctx context.Context, req *pb.LangURequest) (*pb.Response, error) {
	var langs []domain.ERPLanguage
	for _, item := range req.Result {
		idxNo := int(item.IdxNo)
		name := item.LanguageName
		code := item.LanguageCode
		remark := item.Remark
		updatedBy := item.UpdatedBy
		seq := int(item.LanguageSeq)

		langs = append(langs, domain.ERPLanguage{
			LanguageSeq:  seq,
			IdxNo:        &idxNo,
			LanguageName: &name,
			LanguageCode: &code,
			Remark:       &remark,
			UpdatedBy:    &updatedBy,
		})
	}

	data, err := h.langSvc.LangU(ctx, langs)
	if err != nil {
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}

func (h *LangHandler) LangD(ctx context.Context, req *pb.LangDRequest) (*pb.Response, error) {
	var ids []int
	for _, item := range req.Result {
		if item.LanguageSeq != 0 {
			ids = append(ids, int(item.LanguageSeq))
		}
	}

	data, err := h.langSvc.LangD(ctx, ids)
	if err != nil {
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}

func (h *LangHandler) LangQ(ctx context.Context, req *pb.LangQRequest) (*pb.Response, error) {
	queryKey := ""
	if req.Result != nil {
		queryKey = req.Result.KeyItem1
	}

	data, err := h.langSvc.LangQ(ctx, queryKey)
	if err != nil {
		return utils.ErrorResponse[pb.Response](err.Error()), nil
	}

	return utils.SuccessResponse[pb.Response]("Thành công", data), nil
}
