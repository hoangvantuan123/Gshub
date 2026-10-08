package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"service-datahub/bravo"
	"service-datahub/config"
	"service-datahub/models"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type WorkProcessService struct {
	cfg           *config.Config
	db            *gorm.DB
	configService *ConfigService
	loginService  *LoginService
	bravoClient   *bravo.Client
	logger        *zap.Logger
}

func NewWorkProcessService(
	cfg *config.Config,
	db *gorm.DB,
	configService *ConfigService,
	loginService *LoginService,
	logger *zap.Logger,
) *WorkProcessService {
	return &WorkProcessService{
		cfg:           cfg,
		db:            db,
		configService: configService,
		loginService:  loginService,
		bravoClient:   bravo.NewClient(35 * time.Second),
		logger:        logger,
	}
}

// GetWorkProcess queries Lệnh công đoạn (Master + Detail) from Bravo ERP in strictly 2 requests
func (s *WorkProcessService) GetWorkProcess(
	ctx context.Context,
	clientIP, userAgent string,
	req *models.WorkProcessRequest,
) (*models.WorkProcessResult, error) {
	traceID := uuid.New().String()
	startTime := time.Now()

	// 1. Defaults & Config
	if req.ConfigKey == "" {
		req.ConfigKey = "BravoDefault"
	}
	if req.FiscalYear == "" {
		// Try to deduce fiscal year from DocNo or StageOrderNo pattern (e.g. CD05-0626-0132 -> 2026, CD05-0926-0012(667) -> 2026)
		docToCheck := req.DocNo
		if docToCheck == "" {
			docToCheck = req.StageOrderNo
		}
		if strings.TrimSpace(docToCheck) != "" {
			parts := strings.Split(docToCheck, "-")
			for _, p := range parts {
				p = strings.TrimSpace(p)
				if len(p) >= 4 {
					mStr := p[:2]
					yStr := p[2:4]
					if (mStr >= "01" && mStr <= "12") && (yStr >= "20" && yStr <= "35") {
						req.FiscalYear = "20" + yStr
						break
					}
				}
			}
		}
		if req.FiscalYear == "" {
			req.FiscalYear = fmt.Sprintf("%d", time.Now().Year())
		}
	}
	erpCfg, err := s.configService.GetConfigByKey(ctx, req.ConfigKey)
	if err != nil {
		return nil, fmt.Errorf("failed to load ERP config '%s': %w", req.ConfigKey, err)
	}

	token, err := s.resolveValidToken(ctx, req.ConfigKey, req.Username, req.Token)
	if err != nil {
		return nil, fmt.Errorf("failed to obtain ERP access token: %w", err)
	}

	// 2. Resolve Master & Detail Endpoint configs dynamically from DB
	masterEndpointKey := "WorkDocCD_Master"
	if req.EndpointKey != "" {
		masterEndpointKey = req.EndpointKey
	} else if req.ApiKey != "" {
		if strings.HasSuffix(req.ApiKey, "_Master") {
			masterEndpointKey = req.ApiKey
		} else if req.ApiKey == "WorkDocCD" {
			masterEndpointKey = "WorkDocCD_Master"
		} else {
			masterEndpointKey = req.ApiKey
		}
	} else if req.MenuKey != "" {
		masterEndpointKey = req.MenuKey
	}
	masterEpConfig, err := s.configService.GetEndpointByKey(ctx, masterEndpointKey, req.ConfigKey)
	if err != nil || masterEpConfig == nil {
		return nil, fmt.Errorf("ERP Endpoint not configured in DB for Master key: '%s' (ConfigKey: '%s')", masterEndpointKey, req.ConfigKey)
	}

	detailEndpointKey := "WorkDocCD_Detail"
	if req.EndpointKey != "" {
		detailEndpointKey = req.EndpointKey
	} else if req.ApiKey != "" {
		if strings.HasSuffix(req.ApiKey, "_Detail") {
			detailEndpointKey = req.ApiKey
		} else if req.ApiKey == "WorkDocCD" {
			detailEndpointKey = "WorkDocCD_Detail"
		} else {
			detailEndpointKey = req.ApiKey
		}
	}
	detailEpConfig, err := s.configService.GetEndpointByKey(ctx, detailEndpointKey, req.ConfigKey)
	if err != nil || detailEpConfig == nil {
		return nil, fmt.Errorf("ERP Endpoint not configured in DB for Detail key: '%s' (ConfigKey: '%s')", detailEndpointKey, req.ConfigKey)
	}

	masterEndpoint := req.Endpoint
	if masterEndpoint == "" {
		masterEndpoint = masterEpConfig.Endpoint
	}
	if masterEndpoint == "" {
		return nil, fmt.Errorf("ERP Endpoint URL/UUID is empty for Master key: '%s' in DB", masterEndpointKey)
	}

	detailEndpoint := detailEpConfig.Endpoint
	if detailEndpoint == "" {
		detailEndpoint = masterEndpoint
	}
	if detailEndpoint == "" {
		return nil, fmt.Errorf("ERP Endpoint URL/UUID is empty for Detail key: '%s' in DB", detailEndpointKey)
	}

	reqOpts := bravo.RequestOptions{
		BaseURL:            erpCfg.BaseApiUrl,
		Endpoint:           masterEndpoint,
		Token:              token,
		BranchCode:         req.BranchCode,
		FiscalYear:         req.FiscalYear,
		Referer:            erpCfg.Referer,
		ClientIP:           clientIP,
		UserAgent:          userAgent,
		InsecureSkipVerify: erpCfg.InsecureSkipVerify,
	}

	detailReqOpts := reqOpts
	detailReqOpts.Endpoint = detailEndpoint

	s.logger.Info("[WorkProcess Search Request]",
		zap.String("menu_key", req.MenuKey),
		zap.String("api_key", req.ApiKey),
		zap.String("master_endpoint", masterEndpoint),
		zap.String("stage_order_no", req.StageOrderNo),
		zap.String("doc_no", req.DocNo),
		zap.String("item_code", req.ItemCode),
		zap.String("item_name", req.ItemName),
		zap.String("work_process_code", req.WorkProcessCode),
		zap.String("factory_name", req.FactoryName),
		zap.String("branch_code", req.BranchCode),
		zap.Int("page", req.Page),
	)

	rawResponses := make(map[string]interface{})

	// ----------------------------------------------------------------------------------
	// STEP 1: Query Master (Ct - vB30WorkProcess_Explorer)
	// ----------------------------------------------------------------------------------
	masterPayload := s.buildMasterPayload(req, masterEpConfig)
	masterRespBytes, err := s.bravoClient.DoPost(ctx, reqOpts, masterPayload)
	if err != nil {
		s.logger.Error("Step 1 failed: vB30WorkProcess_Explorer", zap.Error(err), zap.String("trace_id", traceID))
		return nil, fmt.Errorf("step 1 master query failed: %w", err)
	}
	if req.IncludeRaw {
		var raw1 interface{}
		_ = json.Unmarshal(masterRespBytes, &raw1)
		rawResponses["step1_master"] = raw1
	}

	masterRows := bravo.ExtractRows(masterRespBytes)
	s.logger.Info("[WorkProcess Step 1] Master Ct queried",
		zap.Int("master_rows_count", len(masterRows)),
	)

	// ----------------------------------------------------------------------------------
	// STEP 2: Query Detail (ChildTable_Detail - vB30WorkProcessDetail_Explorer)
	// ----------------------------------------------------------------------------------
	type masterDetailResult struct {
		masterID string
		details  []models.WorkProcessDetail
		rawResp  interface{}
	}

	hasDetailFilter := s.hasDetailFilter(req)

	detailChan := make(chan masterDetailResult, len(masterRows))
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 15) // Up to 15 concurrent workers

	for _, mRow := range masterRows {
		mID := bravo.GetStringField(mRow, "Stt", "Id", "id", "ID", "RowId")
		if mID == "" {
			continue
		}
		wg.Add(1)
		go func(masterID string) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			detailPayload := s.buildDetailPayload(masterID, req, detailEpConfig)
			detailRespBytes, dErr := s.bravoClient.DoPost(ctx, detailReqOpts, detailPayload)
			if dErr != nil {
				s.logger.Warn("Step 2 detail query failed for master", zap.String("master_id", masterID), zap.Error(dErr))
				return
			}

			var raw2 interface{}
			if req.IncludeRaw {
				_ = json.Unmarshal(detailRespBytes, &raw2)
			}

			rawDetails := bravo.ExtractRows(detailRespBytes)
			var matched []models.WorkProcessDetail

			for _, dRow := range rawDetails {
				if !hasDetailFilter || s.matchesDetailFilter(dRow, req) {
					matched = append(matched, models.WorkProcessDetail{
						Detail: dRow,
						Steps:  []map[string]interface{}{},
					})
				}
			}

			detailChan <- masterDetailResult{
				masterID: masterID,
				details:  matched,
				rawResp:  raw2,
			}
		}(mID)
	}

	wg.Wait()
	close(detailChan)

	detailRowsByMaster := make(map[string][]models.WorkProcessDetail)
	totalDetails := 0
	var rawDetailList []interface{}

	for res := range detailChan {
		detailRowsByMaster[res.masterID] = res.details
		totalDetails += len(res.details)
		if res.rawResp != nil {
			rawDetailList = append(rawDetailList, res.rawResp)
		}
	}

	if req.IncludeRaw && len(rawDetailList) > 0 {
		rawResponses["step2_detail"] = rawDetailList
	}

	s.logger.Info("[API 2 - Child Detail] Processed",
		zap.Int("master_count", len(masterRows)),
		zap.Int("matched_details", totalDetails),
	)

	// ----------------------------------------------------------------------------------
	// Assemble Aggregated Result: Master automatically maps to matched Details
	// ----------------------------------------------------------------------------------
	var items []models.WorkProcessItem
	for _, mRow := range masterRows {
		mID := bravo.GetStringField(mRow, "Stt", "Id", "id", "ID", "RowId")
		details := detailRowsByMaster[mID]
		if details == nil {
			details = []models.WorkProcessDetail{}
		}
		// If detail filters were requested, only include master if it has matched details
		if hasDetailFilter && len(details) == 0 {
			continue
		}
		items = append(items, models.WorkProcessItem{
			Master:  mRow,
			Details: details,
		})
	}

	totalCount, _, hasOpv := bravo.ExtractOpv(masterRespBytes)
	reqPage := 0
	if req != nil && req.Page > 0 {
		reqPage = req.Page
	}
	if !hasOpv || hasDetailFilter {
		totalCount = len(items)
	}
	pageSize := len(masterRows)
	if req != nil && req.PageSize > 0 {
		pageSize = req.PageSize
	} else if pageSize == 0 {
		pageSize = 100
	}

	hasMore := false
	if hasOpv && !hasDetailFilter {
		hasMore = totalCount > (reqPage+1)*len(masterRows) && len(masterRows) > 0
	} else {
		hasMore = len(masterRows) >= pageSize
	}

	result := &models.WorkProcessResult{
		DocNo:       req.DocNo,
		TotalMaster: len(items),
		TotalDetail: totalDetails,
		TotalSteps:  0,
		TotalCount:  totalCount,
		Page:        reqPage,
		PageSize:    pageSize,
		HasMore:     hasMore,
		Data:        items,
	}
	if req.IncludeRaw {
		result.Raw = rawResponses
	}

	s.logger.Info("WorkProcess completed successfully",
		zap.String("stage_order_no", req.StageOrderNo),
		zap.String("doc_no", req.DocNo),
		zap.Int("masters", len(items)),
		zap.Int("details", totalDetails),
		zap.Int64("latency_ms", time.Since(startTime).Milliseconds()),
	)

	return result, nil
}

// isAllValue checks if a filter string represents the "All" wildcard
func isAllValue(val string) bool {
	v := strings.ToLower(strings.TrimSpace(val))
	return v == "" || v == "all" || v == "tất cả" || v == "-- tất cả --" || v == "-- tất cả nhà máy --" || v == "tất cả nhà máy" || v == "tất cả chi nhánh" || v == "-- tất cả chi nhánh --"
}

// hasDetailFilter checks if any detail-specific filter criterion is requested
func (s *WorkProcessService) hasDetailFilter(req *models.WorkProcessRequest) bool {
	if req == nil {
		return false
	}
	if strings.TrimSpace(req.StageOrderNo) != "" ||
		strings.TrimSpace(req.ItemCode) != "" || len(req.ItemCodes) > 0 ||
		strings.TrimSpace(req.ItemName) != "" || len(req.ItemNames) > 0 ||
		strings.TrimSpace(req.Unit) != "" {
		return true
	}

	detailColMap := map[string]bool{
		"stageorderno": true, "docno_detail": true, "docnor": true,
		"itemcode": true, "mahang": true, "mavt": true,
		"itemname": true, "tenhang": true, "tenvt": true,
		"unit": true, "dvt": true, "quantityso": true, "quantitycdissue": true,
		"quantityproduce": true, "quantity": true, "quantitypass": true,
		"quantityadj": true, "quantityafteradj": true, "quantityoff": true,
		"quantityreceipt": true, "ratereceipt": true, "iscomplete": true,
		"closed": true, "isstop": true, "allowadj": true,
		"deliverydatedo": true, "closeddate": true,
	}

	for col, val := range req.ColumnFilters {
		if val == nil {
			continue
		}
		lowerCol := strings.ToLower(strings.TrimSpace(col))
		if detailColMap[lowerCol] {
			return true
		}
	}
	return false
}

// resolveValidToken gets cached token session or performs automatic authentication
func (s *WorkProcessService) resolveValidToken(ctx context.Context, configKey, username, token string) (string, error) {
	if strings.TrimSpace(token) != "" {
		return strings.TrimSpace(token), nil
	}

	targetUser := username
	if targetUser == "" {
		targetUser = s.cfg.Bravo.DefaultUsername
	}

	if targetUser != "" {
		session, err := s.loginService.GetTokenSession(ctx, configKey, targetUser)
		if err == nil && session != nil && session.AccessToken != "" {
			return session.AccessToken, nil
		}
	}

	return "", fmt.Errorf("active ERP access token/session not found for user '%s'. Please login first", targetUser)
}

// buildDynamicFilterTree constructs separate filter AST trees: Master (Ct) vs Detail (ChildTable_Detail)
func (s *WorkProcessService) buildDynamicFilterTree(req *models.WorkProcessRequest) (ctConditions []map[string]interface{}, detailConditions []map[string]interface{}) {
	if req == nil {
		return nil, nil
	}

	// ---------------- MASTER ONLY CONDITIONS (Ct) ----------------
	// 1. DocNo (Master: Ct.DocNo)
	if strings.TrimSpace(req.DocNo) != "" && !isAllValue(req.DocNo) {
		if node := bravo.BuildFieldOrFilter("DocNo", strings.TrimSpace(req.DocNo)); node != nil {
			ctConditions = append(ctConditions, node)
		}
	} else if strings.TrimSpace(req.StageOrderNo) != "" && !isAllValue(req.StageOrderNo) {
		// If DocNo is not specified, but StageOrderNo is provided (e.g. "CD05-0926-0012(667)"),
		// extract base DocNo ("CD05-0926-0012") to optimize Step 1 Master lookup in Ct table
		baseDoc := strings.TrimSpace(req.StageOrderNo)
		if pIdx := strings.Index(baseDoc, "("); pIdx > 0 {
			baseDoc = strings.TrimSpace(baseDoc[:pIdx])
		}
		if node := bravo.BuildFieldOrFilter("DocNo", baseDoc); node != nil {
			ctConditions = append(ctConditions, node)
		}
	}

	// 2. WorkProcessCode (Master: Ct.WorkProcessCode)
	if strings.TrimSpace(req.WorkProcessCode) != "" && !isAllValue(req.WorkProcessCode) {
		if node := bravo.BuildFieldOrFilter("WorkProcessCode", strings.TrimSpace(req.WorkProcessCode)); node != nil {
			ctConditions = append(ctConditions, node)
		}
	}

	// 3. ProductTypeName (Master: Ct.ProductTypeName)
	if strings.TrimSpace(req.ProductTypeName) != "" && !isAllValue(req.ProductTypeName) {
		if node := bravo.BuildFieldOrFilter("ProductTypeName", strings.TrimSpace(req.ProductTypeName)); node != nil {
			ctConditions = append(ctConditions, node)
		}
	}

	// 4. FactoryName (Master: Ct.FactoryName)
	if strings.TrimSpace(req.FactoryName) != "" && !isAllValue(req.FactoryName) {
		if node := bravo.BuildFieldOrFilter("FactoryName", strings.TrimSpace(req.FactoryName)); node != nil {
			ctConditions = append(ctConditions, node)
		}
	}

	// 5. CustomerName (Master: Ct.CustomerName)
	if strings.TrimSpace(req.CustomerName) != "" && !isAllValue(req.CustomerName) {
		if node := bravo.BuildFieldOrFilter("CustomerName", strings.TrimSpace(req.CustomerName)); node != nil {
			ctConditions = append(ctConditions, node)
		}
	}

	// 6. Description (Master: Ct.Description)
	if strings.TrimSpace(req.Description) != "" && !isAllValue(req.Description) {
		if node := bravo.BuildFieldOrFilter("Description", strings.TrimSpace(req.Description)); node != nil {
			ctConditions = append(ctConditions, node)
		}
	}

	// ---------------- DETAIL ONLY CONDITIONS (ChildTable_Detail) ----------------
	// 7. StageOrderNo (Detail: DocNo_Detail, DocNoR, StageOrderNo)
	if strings.TrimSpace(req.StageOrderNo) != "" && !isAllValue(req.StageOrderNo) {
		fullDoc := strings.TrimSpace(req.StageOrderNo)
		baseDoc := fullDoc
		var insideParen string
		if pIdx := strings.Index(fullDoc, "("); pIdx >= 0 {
			baseDoc = strings.TrimSpace(fullDoc[:pIdx])
			endIdx := strings.Index(fullDoc, ")")
			if endIdx > pIdx {
				insideParen = strings.TrimSpace(fullDoc[pIdx+1 : endIdx])
			}
		}
		var docVariants []string
		docVariants = append(docVariants, fullDoc)
		if baseDoc != "" && baseDoc != fullDoc {
			docVariants = append(docVariants, baseDoc)
		}
		if insideParen != "" {
			docVariants = append(docVariants, insideParen)
		}
		if strings.Contains(baseDoc, "-") {
			parts := strings.Split(baseDoc, "-")
			if len(parts) >= 2 {
				docVariants = append(docVariants, strings.Join(parts[1:], "-"))
			}
			if len(parts) >= 3 {
				docVariants = append(docVariants, parts[len(parts)-1])
			}
		}
		if node := bravo.BuildMultiColsOrFilter([]string{"DocNo_Detail", "DocNoR", "StageOrderNo"}, docVariants...); node != nil {
			detailConditions = append(detailConditions, node)
		}
	}

	// 8. ItemCode & ItemCodes (Detail: ItemCode)
	var itemCodeArgs []string
	if strings.TrimSpace(req.ItemCode) != "" && !isAllValue(req.ItemCode) {
		itemCodeArgs = append(itemCodeArgs, req.ItemCode)
	}
	for _, ic := range req.ItemCodes {
		if strings.TrimSpace(ic) != "" && !isAllValue(ic) {
			itemCodeArgs = append(itemCodeArgs, ic)
		}
	}
	if len(itemCodeArgs) > 0 {
		if node := bravo.BuildFieldOrFilter("ItemCode", itemCodeArgs...); node != nil {
			detailConditions = append(detailConditions, node)
		}
	}

	// 9. ItemName & ItemNames (Detail: ItemName)
	var itemNameArgs []string
	if strings.TrimSpace(req.ItemName) != "" && !isAllValue(req.ItemName) {
		itemNameArgs = append(itemNameArgs, req.ItemName)
	}
	for _, in := range req.ItemNames {
		if strings.TrimSpace(in) != "" && !isAllValue(in) {
			itemNameArgs = append(itemNameArgs, in)
		}
	}
	if len(itemNameArgs) > 0 {
		if node := bravo.BuildFieldOrFilter("ItemName", itemNameArgs...); node != nil {
			detailConditions = append(detailConditions, node)
		}
	}

	// 10. Unit (Detail: Unit)
	if strings.TrimSpace(req.Unit) != "" && !isAllValue(req.Unit) {
		if node := bravo.BuildFieldOrFilter("Unit", strings.TrimSpace(req.Unit)); node != nil {
			detailConditions = append(detailConditions, node)
		}
	}

	// 11. Generic ColumnFilters with strict separation
	masterColMap := map[string]string{
		"docno":           "DocNo",
		"workprocesscode": "WorkProcessCode",
		"producttypename": "ProductTypeName",
		"factoryname":     "FactoryName",
		"branchcode":      "FactoryName",
		"chinhanh":        "FactoryName",
		"nhamay":          "FactoryName",
		"customername":    "CustomerName",
		"khachhang":       "CustomerName",
		"description":     "Description",
		"diengiai":        "Description",
		"docdate":         "DocDate",
		"docstatus":       "DocStatus",
		"doccode":         "DocCode",
		"postsl":          "PostSL",
		"ischecksample":   "IsCheckSample",
		"createdby_name":  "CreatedBy_Name",
		"createdby":       "CreatedBy_Name",
		"modifiedby_name": "ModifiedBy_Name",
		"modifiedby":      "ModifiedBy_Name",
		"createdat":       "CreatedAt",
		"modifiedat":      "ModifiedDate",
		"modifieddate":    "ModifiedDate",
	}

	detailColMap := map[string][]string{
		"stageorderno":     {"DocNo_Detail", "DocNoR"},
		"docno_detail":     {"DocNo_Detail", "DocNoR"},
		"docnor":           {"DocNoR", "DocNo_Detail"},
		"itemcode":         {"ItemCode"},
		"mahang":           {"ItemCode"},
		"mavt":             {"ItemCode"},
		"itemname":         {"ItemName"},
		"tenhang":          {"ItemName"},
		"tenvt":            {"ItemName"},
		"unit":             {"Unit"},
		"dvt":              {"Unit"},
		"quantityso":       {"QuantitySO"},
		"quantitycdissue":  {"QuantityCDIssue"},
		"quantityproduce":  {"QuantityProduce"},
		"quantity":         {"QuantityProduce"},
		"quantitypass":     {"QuantityPass"},
		"quantityadj":      {"QuantityAdj"},
		"quantityafteradj": {"QuantityAfterAdj"},
		"quantityoff":      {"QuantityOff"},
		"quantityreceipt":  {"QuantityReceipt"},
		"ratereceipt":      {"RateReceipt"},
		"iscomplete":       {"IsComplete"},
		"closed":           {"Closed"},
		"isstop":           {"IsStop"},
		"allowadj":         {"AllowAdj"},
		"deliverydatedo":   {"DeliveryDateDO"},
		"closeddate":       {"ClosedDate"},
	}

	for col, val := range req.ColumnFilters {
		colName := strings.TrimSpace(col)
		if colName == "" || val == nil {
			continue
		}
		lowerCol := strings.ToLower(colName)
		if lowerCol == "operationcode" || lowerCol == "workingtag" || lowerCol == "stepcount" {
			continue
		}

		var strVals []string
		switch v := val.(type) {
		case string:
			if strings.TrimSpace(v) != "" && !isAllValue(v) {
				strVals = []string{strings.TrimSpace(v)}
			}
		case []string:
			for _, sVal := range v {
				if strings.TrimSpace(sVal) != "" && !isAllValue(sVal) {
					strVals = append(strVals, strings.TrimSpace(sVal))
				}
			}
		case []interface{}:
			for _, item := range v {
				sVal := fmt.Sprintf("%v", item)
				if strings.TrimSpace(sVal) != "" && !isAllValue(sVal) {
					strVals = append(strVals, strings.TrimSpace(sVal))
				}
			}
		default:
			sVal := fmt.Sprintf("%v", val)
			if strings.TrimSpace(sVal) != "" && !isAllValue(sVal) {
				strVals = []string{strings.TrimSpace(sVal)}
			}
		}

		if len(strVals) == 0 {
			continue
		}

		if mField, ok := masterColMap[lowerCol]; ok {
			if node := bravo.BuildFieldOrFilter(mField, strVals...); node != nil {
				ctConditions = append(ctConditions, node)
			}
		} else if dFields, ok := detailColMap[lowerCol]; ok {
			if node := bravo.BuildMultiColsOrFilter(dFields, strVals...); node != nil {
				detailConditions = append(detailConditions, node)
			}
		}
	}

	return ctConditions, detailConditions
}

// buildMasterPayload constructs Payload 1 for Master table
func (s *WorkProcessService) buildMasterPayload(req *models.WorkProcessRequest, epConfig *models.ErpEndpoint) map[string]interface{} {
	branchFilter := "1=1"
	if req != nil && strings.TrimSpace(req.BranchCode) != "" && !isAllValue(req.BranchCode) {
		branchFilter = fmt.Sprintf("ISNULL(BranchCode,'') IN ('','%s')", strings.TrimSpace(req.BranchCode))
	}

	san := "Ct"
	stn := "vB30WorkProcess_Explorer"
	alc := "CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher"
	ndcn := "_NoDelete_gim00a"
	nocn := "_NoOpen_esjp5f"
	necn := "_NoEdit_tc393n"
	nrcn := "_NoRecall_voxx2"

	if epConfig != nil {
		if epConfig.San != "" {
			san = epConfig.San
		}
		if epConfig.Stn != "" {
			stn = epConfig.Stn
		}
		if epConfig.Alc != "" {
			alc = epConfig.Alc
		}
		if epConfig.Ndcn != "" {
			ndcn = epConfig.Ndcn
		}
		if epConfig.Nocn != "" {
			nocn = epConfig.Nocn
		}
		if epConfig.Necn != "" {
			necn = epConfig.Necn
		}
		if epConfig.Nrcn != "" {
			nrcn = epConfig.Nrcn
		}
	}

	fields := []string{
		"DocNo", "DocDate", "DocStatus", "ApprovalStatus", "DocCode", "PostSL", "WorkProcessCode",
		"ProductTypeName", "Description", "IsCheckSample", "FactoryName", "CustomerName",
		"CreatedBy_Name", "CreatedAt", "ItemCode", "ItemName", "Quantity", "Id",
		"Stt", "CreatedBy", "ModifiedBy", "ModifiedAt",
	}

	pnb := 0
	if req != nil && req.Page > 0 {
		pnb = req.Page
	}

	payload := map[string]interface{}{
		"ipo":  false,
		"san":  san,
		"stn":  stn,
		"alc":  alc,
		"ndcn": ndcn,
		"nocn": nocn,
		"necn": necn,
		"nrcn": nrcn,
		"lst":  0,
		"tpid": "ParentId",
		"pnb":  pnb,
		"vlm":  nil,
		"iis":  false,
		"fit": []map[string]interface{}{
			{
				"opr": 23,
				"eps": []map[string]interface{}{
					{"opr": 17, "eps": []interface{}{map[string]interface{}{"opr": 14, "eps": []map[string]interface{}{{"opr": 4, "val": san}, {"opr": 4, "val": "IsGroup"}}}, map[string]interface{}{"opr": 4, "val": 0}}},
					{"opr": 17, "eps": []interface{}{map[string]interface{}{"opr": 14, "eps": []map[string]interface{}{{"opr": 4, "val": san}, {"opr": 4, "val": "IsActive"}}}, map[string]interface{}{"opr": 4, "val": 1}}},
				},
			},
		},
		"sot":  []map[string]interface{}{{"opr": 4, "val": "DocStatus"}},
		"fcle": bravo.BuildNestedFcle(fields),
		"lps":  map[string]interface{}{"BRANCHFILTER('BranchCode')": branchFilter},
		"pkv":  nil,
	}

	if req != nil && len(req.RawSSE) > 0 {
		payload["sse"] = req.RawSSE
	} else if req != nil {
		ctConditions, _ := s.buildDynamicFilterTree(req)
		dss := make(map[string]interface{})
		if len(ctConditions) > 0 {
			if node := bravo.CombineAnd(ctConditions); node != nil {
				dss[san] = []map[string]interface{}{node}
			}
		}
		if len(dss) > 0 {
			payload["sse"] = map[string]interface{}{"dss": dss}
		}
	}

	return payload
}

// buildDetailPayload constructs Payload 2 for Detail table for a single master record
func (s *WorkProcessService) buildDetailPayload(masterID string, req *models.WorkProcessRequest, epConfig *models.ErpEndpoint) map[string]interface{} {
	branchFilter := "1=1"
	if req != nil && strings.TrimSpace(req.BranchCode) != "" && !isAllValue(req.BranchCode) {
		branchFilter = fmt.Sprintf("ISNULL(BranchCode,'') IN ('','%s')", strings.TrimSpace(req.BranchCode))
	}

	san := "ChildTable_Detail"
	stn := "vB30WorkProcessDetail_Explorer"
	alc := "CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher"
	ndcn := "_NoDelete_in55v"
	nocn := "_NoOpen_osvfze"
	necn := "_NoEdit_z1dhnu"
	nrcn := "_NoRecall_a48pk"

	if epConfig != nil {
		if epConfig.San != "" {
			san = epConfig.San
		}
		if epConfig.Stn != "" {
			stn = epConfig.Stn
		}
		if epConfig.Alc != "" {
			alc = epConfig.Alc
		}
		if epConfig.Ndcn != "" {
			ndcn = epConfig.Ndcn
		}
		if epConfig.Nocn != "" {
			nocn = epConfig.Nocn
		}
		if epConfig.Necn != "" {
			necn = epConfig.Necn
		}
		if epConfig.Nrcn != "" {
			nrcn = epConfig.Nrcn
		}
	}

	fields := []string{
		"DocNo_Detail", "DocNoR", "ItemCode", "ItemName", "Unit",
		"QuantitySO", "QuantityCDIssue", "QuantityPass", "AllowAdj", "QuantityAdj",
		"QuantityAfterAdj", "QuantityOff", "QuantityProduce", "Closed", "IsStop",
		"IsComplete", "QuantityReceipt", "RateReceipt", "DeliveryDateDO", "ClosedDate",
		"RowId_SO", "CustomerName", "RowId", "Stt", "Id", "CreatedBy", "CreatedAt",
		"ModifiedBy", "ModifiedAt",
	}

	payload := map[string]interface{}{
		"ipo":  false,
		"san":  san,
		"stn":  stn,
		"alc":  alc,
		"ndcn": ndcn,
		"nocn": nocn,
		"necn": necn,
		"nrcn": nrcn,
		"lst":  0,
		"tpid": "ParentId",
		"pnb":  0,
		"vlm":  nil,
		"iis":  false,
		"sot":  []map[string]interface{}{{"opr": 4, "val": "DocNo_Detail", "atb": []map[string]interface{}{{"opr": 4, "val": "DESC"}}}},
		"fcle": bravo.BuildNestedFcle(fields),
		"lps":  map[string]interface{}{"BRANCHFILTER('BranchCode')": branchFilter},
		"pkv":  []string{masterID},
	}

	if req != nil && len(req.RawSSE) > 0 {
		payload["sse"] = req.RawSSE
	}

	return payload
}

// matchesDetailFilter checks if a child detail row satisfies filter criteria across all Detail columns
func (s *WorkProcessService) matchesDetailFilter(row map[string]interface{}, req *models.WorkProcessRequest) bool {
	if req == nil {
		return true
	}
	// 1. StageOrderNo filter (Detail: DocNo_Detail, DocNoR, StageOrderNo, DocNo, Stt, Id, RowId)
	if strings.TrimSpace(req.StageOrderNo) != "" {
		fullDoc := strings.TrimSpace(req.StageOrderNo)
		baseDoc := fullDoc
		var insideParen string
		if pIdx := strings.Index(fullDoc, "("); pIdx >= 0 {
			baseDoc = strings.TrimSpace(fullDoc[:pIdx])
			endIdx := strings.Index(fullDoc, ")")
			if endIdx > pIdx {
				insideParen = strings.TrimSpace(fullDoc[pIdx+1 : endIdx])
			}
		}
		var variants []string
		variants = append(variants, fullDoc)
		if baseDoc != "" && baseDoc != fullDoc {
			variants = append(variants, baseDoc)
		}
		if insideParen != "" {
			variants = append(variants, insideParen)
		}
		if strings.Contains(baseDoc, "-") {
			parts := strings.Split(baseDoc, "-")
			if len(parts) >= 2 {
				variants = append(variants, strings.Join(parts[1:], "-"))
			}
			if len(parts) >= 3 {
				variants = append(variants, parts[len(parts)-1])
			}
		}
		if !bravo.MatchesAnyRowField(row, []string{"DocNo_Detail", "DocNoR", "StageOrderNo", "DocNo", "Stt", "Id", "RowId"}, variants...) {
			return false
		}
	}
	// 2. ItemCode & ItemCodes
	var itemCodeArgs []string
	if strings.TrimSpace(req.ItemCode) != "" {
		itemCodeArgs = append(itemCodeArgs, req.ItemCode)
	}
	itemCodeArgs = append(itemCodeArgs, req.ItemCodes...)
	if len(itemCodeArgs) > 0 {
		if !bravo.MatchesAnyRowField(row, []string{"ItemCode", "Item_Code"}, itemCodeArgs...) {
			return false
		}
	}
	// 3. ItemName & ItemNames
	var itemNameArgs []string
	if strings.TrimSpace(req.ItemName) != "" {
		itemNameArgs = append(itemNameArgs, req.ItemName)
	}
	itemNameArgs = append(itemNameArgs, req.ItemNames...)
	if len(itemNameArgs) > 0 {
		if !bravo.MatchesAnyRowField(row, []string{"ItemName", "Item_Name"}, itemNameArgs...) {
			return false
		}
	}
	// 4. Unit
	if strings.TrimSpace(req.Unit) != "" && !bravo.MatchesRowField(row, "Unit", req.Unit) {
		return false
	}
	// 5. Generic ColumnFilters across Detail columns
	detailColMap := map[string][]string{
		"stageorderno":     {"DocNo_Detail", "DocNoR", "StageOrderNo"},
		"docno_detail":     {"DocNo_Detail", "DocNoR", "StageOrderNo"},
		"docnor":           {"DocNoR", "DocNo_Detail"},
		"itemcode":         {"ItemCode", "Item_Code"},
		"mahang":           {"ItemCode", "Item_Code"},
		"mavt":             {"ItemCode", "Item_Code"},
		"itemname":         {"ItemName", "Item_Name"},
		"tenhang":          {"ItemName", "Item_Name"},
		"tenvt":            {"ItemName", "Item_Name"},
		"unit":             {"Unit"},
		"dvt":              {"Unit"},
		"quantityso":       {"QuantitySO"},
		"quantitycdissue":  {"QuantityCDIssue"},
		"quantityproduce":  {"QuantityProduce", "Quantity"},
		"quantity":         {"QuantityProduce", "Quantity"},
		"quantitypass":     {"QuantityPass"},
		"quantityadj":      {"QuantityAdj"},
		"quantityafteradj": {"QuantityAfterAdj"},
		"quantityoff":      {"QuantityOff"},
		"quantityreceipt":  {"QuantityReceipt"},
		"ratereceipt":      {"RateReceipt"},
		"iscomplete":       {"IsComplete"},
		"closed":           {"Closed"},
		"isstop":           {"IsStop"},
		"allowadj":         {"AllowAdj"},
		"deliverydatedo":   {"DeliveryDateDO"},
		"closeddate":       {"ClosedDate"},
	}

	for col, val := range req.ColumnFilters {
		colName := strings.TrimSpace(col)
		if colName == "" || val == nil {
			continue
		}
		lowerCol := strings.ToLower(colName)
		candidateKeys, ok := detailColMap[lowerCol]
		if !ok {
			// Skip Master columns or UI-only columns when evaluating detail row
			continue
		}

		var strVals []string
		switch v := val.(type) {
		case string:
			strVals = []string{v}
		case []string:
			strVals = v
		case []interface{}:
			for _, item := range v {
				strVals = append(strVals, fmt.Sprintf("%v", item))
			}
		default:
			strVals = []string{fmt.Sprintf("%v", val)}
		}

		// Normalize boolean / flag values: "1", "0", "true", "false"
		var expandedVals []string
		for _, sv := range strVals {
			expandedVals = append(expandedVals, sv)
			if sv == "1" || strings.EqualFold(sv, "true") {
				expandedVals = append(expandedVals, "1", "true", "True")
			} else if sv == "0" || strings.EqualFold(sv, "false") {
				expandedVals = append(expandedVals, "0", "false", "False")
			}
		}

		if !bravo.MatchesAnyRowField(row, candidateKeys, expandedVals...) {
			return false
		}
	}
	return true
}
