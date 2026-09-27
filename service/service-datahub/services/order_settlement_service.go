package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"service-datahub/bravo"
	"service-datahub/config"
	"service-datahub/models"

	"go.uber.org/zap"
)

type OrderSettlementService struct {
	cfg           *config.Config
	configService *ConfigService
	loginService  *LoginService
	bravoClient   *bravo.Client
	logger        *zap.Logger
}

func NewOrderSettlementService(
	cfg *config.Config,
	configService *ConfigService,
	loginService *LoginService,
	workProcessService *WorkProcessService,
	logger *zap.Logger,
) *OrderSettlementService {
	return &OrderSettlementService{
		cfg:           cfg,
		configService: configService,
		loginService:  loginService,
		bravoClient:   bravo.NewClient(45 * time.Second),
		logger:        logger,
	}
}

// GetOrderSettlement thực hiện truy vấn trực tiếp Stored Procedure báo cáo tổng hợp lệnh thao tác:
// Endpoint: 13965d2918007354dfa7a43183486a57
// Procedure: usp_TK_THLTT
func (s *OrderSettlementService) GetOrderSettlement(
	ctx context.Context,
	clientIP, userAgent string,
	req *models.OrderSettlementRequest,
) (*models.OrderSettlementResponse, error) {
	startTime := time.Now()

	if req == nil {
		req = &models.OrderSettlementRequest{}
	}
	if req.ConfigKey == "" {
		req.ConfigKey = "BravoDefault"
	}
	if req.FiscalYear == "" {
		req.FiscalYear = fmt.Sprintf("%d", time.Now().Year())
	}
	if req.BranchCode == "" {
		req.BranchCode = "A01"
	}

	erpCfg, err := s.configService.GetConfigByKey(ctx, req.ConfigKey)
	if err != nil {
		return nil, fmt.Errorf("failed to load ERP config '%s': %w", req.ConfigKey, err)
	}
	token, err := s.resolveValidToken(ctx, req.ConfigKey, req.Username, req.Token)
	if err != nil {
		return nil, fmt.Errorf("failed to authenticate ERP session: %w", err)
	}

	// Endpoint Stored Procedure usp_TK_THLTT
	reportEndpoint := "13965d2918007354dfa7a43183486a57"
	repEpConfig, _ := s.configService.GetEndpointByKey(ctx, "REP_TK_THLTT", req.ConfigKey)
	if repEpConfig != nil && repEpConfig.Endpoint != "" {
		reportEndpoint = repEpConfig.Endpoint
	}

	reqOpts := bravo.RequestOptions{
		BaseURL:            erpCfg.BaseApiUrl,
		Endpoint:           reportEndpoint,
		Token:              token,
		BranchCode:         req.BranchCode,
		FiscalYear:         req.FiscalYear,
		Referer:            erpCfg.Referer,
		ClientIP:           clientIP,
		UserAgent:          userAgent,
		InsecureSkipVerify: erpCfg.InsecureSkipVerify,
	}

	// Chuẩn hóa khoảng ngày @_DocDate1 và @_DocDate2 (chỉ truyền khi người dùng có nhập/chọn)
	fromDateStr, toDateStr := s.resolveDateRange(req)

	prmList := []map[string]interface{}{}

	docDate1Param := map[string]interface{}{"dbt": 5, "prn": "@_DocDate1"}
	if fromDateStr != "" {
		docDate1Param["val"] = fromDateStr
	}
	prmList = append(prmList, docDate1Param)

	docDate2Param := map[string]interface{}{"dbt": 5, "prn": "@_DocDate2"}
	if toDateStr != "" {
		docDate2Param["val"] = toDateStr
	}
	prmList = append(prmList, docDate2Param)

	userId := 0
	if req.UserId != nil && fmt.Sprintf("%v", req.UserId) != "" {
		if id, err := strconv.Atoi(fmt.Sprintf("%v", req.UserId)); err == nil && id > 0 {
			userId = id
		}
	}
	if userId == 0 {
		userId = extractUserIdFromToken(token)
	}

	langId := 0
	if req.LangId != nil && fmt.Sprintf("%v", req.LangId) != "" {
		if lid, err := strconv.Atoi(fmt.Sprintf("%v", req.LangId)); err == nil {
			langId = lid
		}
	}

	userIdParam := map[string]interface{}{"dbt": 11, "prn": "@_nUserId"}
	if userId > 0 {
		userIdParam["val"] = userId
	}
	prmList = append(prmList, userIdParam)

	prmList = append(prmList,
		map[string]interface{}{"dbt": 11, "prn": "@_LangId", "val": langId},
	)

	branchParam := map[string]interface{}{"dbt": 0, "sze": 3, "prn": "@_BranchCode"}
	if req.BranchCode != "" {
		branchParam["val"] = req.BranchCode
	}
	prmList = append(prmList, branchParam)

	factoryParam := map[string]interface{}{"dbt": 0, "prn": "@_FactoryId"}
	if req.FactoryId != nil && fmt.Sprintf("%v", req.FactoryId) != "" {
		factoryParam["val"] = req.FactoryId
	}
	prmList = append(prmList, factoryParam)

	factoryTTParam := map[string]interface{}{"dbt": 0, "prn": "@_FactoryIdTT"}
	if req.FactoryIdTT != nil && fmt.Sprintf("%v", req.FactoryIdTT) != "" {
		factoryTTParam["val"] = req.FactoryIdTT
	}
	prmList = append(prmList, factoryTTParam)

	sttParam := map[string]interface{}{"dbt": 0, "sze": 16, "prn": "@_Stt_LTT"}
	if strings.TrimSpace(req.Stt_LTT) != "" {
		sttParam["val"] = strings.TrimSpace(req.Stt_LTT)
	}
	prmList = append(prmList, sttParam)

	itemParam := map[string]interface{}{"dbt": 11, "prn": "@_ItemId"}
	if req.ItemId != nil && fmt.Sprintf("%v", req.ItemId) != "" {
		itemParam["val"] = req.ItemId
	}
	prmList = append(prmList, itemParam)

	deptParam := map[string]interface{}{"dbt": 11, "prn": "@_DeptId"}
	if req.DeptId != nil && fmt.Sprintf("%v", req.DeptId) != "" {
		deptParam["val"] = req.DeptId
	}
	prmList = append(prmList, deptParam)

	prmList = append(prmList, map[string]interface{}{"dbt": 11, "drt": 6, "prn": "@RETURN_VALUE", "val": nil})

	payload := map[string]interface{}{
		"cto": 1800,
		"cmt": "usp_TK_THLTT",
		"prm": prmList,
		"alc": "CommandKey=REP_TK_THLTT|LayoutName=Layout1|TemplateName=Reporter",
		"iis": true,
		"ttl": -1,
	}

	s.logger.Info("[OrderSettlement SP Query] Calling usp_TK_THLTT",
		zap.String("endpoint", reportEndpoint),
		zap.String("FromDate", fromDateStr),
		zap.String("ToDate", toDateStr),
		zap.String("BranchCode", req.BranchCode),
		zap.String("StageOrderNo", req.StageOrderNo),
	)

	respBytes, err := s.bravoClient.DoPost(ctx, reqOpts, payload)
	if err != nil {
		s.logger.Error("usp_TK_THLTT query failed", zap.Error(err))
		return nil, fmt.Errorf("usp_TK_THLTT query failed: %w", err)
	}

	rawRows := bravo.ExtractRows(respBytes)
	s.logger.Info("[OrderSettlement SP Result] Rows extracted",
		zap.Int("raw_rows_count", len(rawRows)),
	)

	flatItems := make([]models.OrderSettlementFlatItem, 0)
	rowCounter := 0

	for _, r := range rawRows {
		if !s.matchesFilter(r, req) {
			continue
		}

		rowCounter++

		stageOrderNo := bravo.GetStringField(r, "DocNoCD", "DocNo", "DocNoTT")
		itemCode := bravo.GetStringField(r, "ItemTTCode", "ItemCode")
		itemName := bravo.GetStringField(r, "ItemTTName", "ItemName")
		unit := bravo.GetStringField(r, "UnitTT", "UnitTTChinh", "Unit")

		closedVal := int(bravo.GetFloatField(r, "Closed"))
		isSettled := closedVal == 1
		status := "Chờ quyết toán"
		if isSettled {
			status = "Đã quyết toán"
		}

		detailNo := bravo.GetStringField(r, "DocNoTT", "Stt_LTT")
		builtinOrder := int(bravo.GetFloatField(r, "PartNoTT", "BuiltinOrder"))
		if builtinOrder == 0 {
			builtinOrder = rowCounter
		}

		opTypeCode := bravo.GetStringField(r, "WorkStepTypeCode")
		opCode := bravo.GetStringField(r, "WorkStepCode")
		opName := bravo.GetStringField(r, "WorkStepName")

		machineCode := bravo.GetStringField(r, "MachineCodeTT", "MachineCode")
		machineName := bravo.GetStringField(r, "MachineNameTT", "MachineName")

		// Số lượng
		doReqQty := bravo.GetFloatField(r, "QuantityAfterAdj9TT", "QuantityPass9")
		initAdjQty := bravo.GetFloatField(r, "QuantityAdj", "TLSHCP")
		adjReqQty := bravo.GetFloatField(r, "QuantityAfterAdj9TT", "QuantityPass9")
		wasteCompQty := bravo.GetFloatField(r, "SLSHCP", "SLSHV")
		prodReqQty := bravo.GetFloatField(r, "QuantityProduce9TT", "QuantityProduce9")
		settleQty := bravo.GetFloatField(r, "QuantityPass9", "QuantityAfterAdj9TT")

		plannedAchieved := doReqQty
		plannedProd := prodReqQty
		statAchieved := bravo.GetFloatField(r, "QuantityPass9")
		statProd := bravo.GetFloatField(r, "QuantityProduce9")
		receiptQty := statAchieved

		settledDate := bravo.GetStringField(r, "DocDateTT", "DocDate", "StartTimeTT")
		if strings.Contains(settledDate, "T") {
			settledDate = strings.Split(settledDate, "T")[0]
		}

		notes := bravo.GetStringField(r, "Remark", "ReasonBroken", "Description")
		factoryName := bravo.GetStringField(r, "FactoryCodeTT", "FactoryName")
		branchCode := bravo.GetStringField(r, "BranchCode")
		if branchCode == "" {
			branchCode = req.BranchCode
		}

		empName := bravo.GetStringField(r, "NameTT", "EmployeeName", "EmployeeName1")
		deptName := bravo.GetStringField(r, "DeptNameTT", "DeptName1")
		shiftCode := bravo.GetStringField(r, "ShifCodeTT", "ShiftCode")
		startTimeStr := bravo.GetStringField(r, "StartTimeTT", "StartTime")
		endTimeStr := bravo.GetStringField(r, "EndtimeTT", "Endtime")
		durationTime := bravo.GetFloatField(r, "DurationTimeTT", "DurationTime")
		qtyError := bravo.GetFloatField(r, "QuantityError9", "QuantityError")
		itemStructName := bravo.GetStringField(r, "ItemStructureName")
		qtcn := bravo.GetStringField(r, "QTCN")

		flatItems = append(flatItems, models.OrderSettlementFlatItem{
			ID:                    fmt.Sprintf("row_%d", rowCounter),
			WorkingTag:            "",
			StageOrderNo:          stageOrderNo,
			ItemCode:              itemCode,
			ItemName:              itemName,
			Unit:                  unit,
			DoRequiredQty:         doReqQty,
			InitialAdjustQty:      initAdjQty,
			AdjustedRequiredQty:   adjReqQty,
			WasteCompensationQty:  wasteCompQty,
			ProductionRequiredQty: prodReqQty,
			IsSettled:             isSettled,
			SettlementQty:         settleQty,
			DetailNo:              detailNo,
			BuiltinOrder:          builtinOrder,
			WorkStepTypeCode:      opTypeCode,
			OperationCode:         opCode,
			OperationName:         opName,
			MachineCode:           machineCode,
			MachineName:           machineName,
			PlannedAchievedQty:    plannedAchieved,
			PlannedProductionQty:  plannedProd,
			StatAchievedQty:       statAchieved,
			StatProductionQty:     statProd,
			WarehouseReceiptQty:   receiptQty,
			Status:                status,
			SettledDate:           settledDate,
			Notes:                 notes,
			FactoryName:           factoryName,
			BranchCode:            branchCode,
			EmployeeName:          empName,
			DeptName:              deptName,
			ShiftCode:             shiftCode,
			StartTime:             startTimeStr,
			EndTime:               endTimeStr,
			DurationTime:          durationTime,
			QuantityError:         qtyError,
			ItemStructureName:     itemStructName,
			QTCN:                  qtcn,
		})
	}

	latency := time.Since(startTime).Milliseconds()

	s.logger.Info("[OrderSettlement Completed]",
		zap.Int("matched_items_count", len(flatItems)),
		zap.Int64("latency_ms", latency),
	)

	return &models.OrderSettlementResponse{
		Items:      flatItems,
		TotalCount: len(flatItems),
		Page:       req.Page,
		PageSize:   req.PageSize,
		HasMore:    false,
		Latency:    latency,
	}, nil
}

func (s *OrderSettlementService) resolveDateRange(req *models.OrderSettlementRequest) (string, string) {
	if req == nil {
		return "", ""
	}
	fromDateStr := parseToBravoDate(req.FromDate)
	toDateStr := parseToBravoDate(req.ToDate)

	return fromDateStr, toDateStr
}

func parseToBravoDate(dateStr string) string {
	s := strings.TrimSpace(dateStr)
	if s == "" {
		return ""
	}

	formats := []string{
		time.RFC1123,
		time.RFC1123Z,
		"2006-01-02T15:04:05",
		"2006-01-02T15:04:05Z",
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02",
		"2006/01/02",
		"02/01/2006",
		"02-01-2006",
		"2006-01-02 15:04:05",
		time.ANSIC,
		time.UnixDate,
		time.RubyDate,
		time.RFC822,
		time.RFC822Z,
		time.RFC850,
	}

	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			loc, locErr := time.LoadLocation("Asia/Ho_Chi_Minh")
			if locErr == nil {
				t = t.In(loc)
			} else {
				t = t.Local()
			}
			return t.Format("2006-01-02T00:00:00")
		}
	}

	if len(s) >= 10 && s[4] == '-' && s[7] == '-' {
		return s[:10] + "T00:00:00"
	}

	return s
}

func (s *OrderSettlementService) matchesFilter(row map[string]interface{}, req *models.OrderSettlementRequest) bool {
	if req == nil {
		return true
	}

	// 1. StageOrderNo (khớp DocNoCD, DocNo, DocNoTT)
	if strings.TrimSpace(req.StageOrderNo) != "" && !isAllValue(req.StageOrderNo) {
		target := strings.ToLower(strings.TrimSpace(req.StageOrderNo))
		baseTarget := target
		var insideParen string
		if pIdx := strings.Index(target, "("); pIdx >= 0 {
			baseTarget = strings.TrimSpace(target[:pIdx])
			endIdx := strings.Index(target, ")")
			if endIdx > pIdx {
				insideParen = strings.TrimSpace(target[pIdx+1 : endIdx])
			}
		}

		docCD := strings.ToLower(bravo.GetStringField(row, "DocNoCD", "DocNo", "DocNoTT"))
		matched := strings.Contains(docCD, target) ||
			(baseTarget != "" && strings.Contains(docCD, baseTarget)) ||
			(insideParen != "" && strings.Contains(docCD, insideParen))

		if !matched {
			return false
		}
	}

	// 2. ItemCode (khớp ItemTTCode, ItemCode)
	if strings.TrimSpace(req.ItemCode) != "" && !isAllValue(req.ItemCode) {
		target := strings.ToLower(strings.TrimSpace(req.ItemCode))
		itemCode := strings.ToLower(bravo.GetStringField(row, "ItemTTCode", "ItemCode"))
		if !strings.Contains(itemCode, target) {
			return false
		}
	}

	// 3. ItemName (khớp ItemTTName, ItemName)
	if strings.TrimSpace(req.ItemName) != "" && !isAllValue(req.ItemName) {
		target := strings.ToLower(strings.TrimSpace(req.ItemName))
		itemName := strings.ToLower(bravo.GetStringField(row, "ItemTTName", "ItemName"))
		if !strings.Contains(itemName, target) {
			return false
		}
	}

	// 4. OperationCode (khớp WorkStepCode)
	if strings.TrimSpace(req.OperationCode) != "" && !isAllValue(req.OperationCode) {
		target := strings.ToLower(strings.TrimSpace(req.OperationCode))
		opCode := strings.ToLower(bravo.GetStringField(row, "WorkStepCode"))
		if !strings.Contains(opCode, target) {
			return false
		}
	}

	// 5. Status (Đã quyết toán vs Chờ quyết toán)
	if strings.TrimSpace(req.Status) != "" && !isAllValue(req.Status) {
		reqStatus := strings.TrimSpace(req.Status)
		closedVal := int(bravo.GetFloatField(row, "Closed"))
		isSettled := closedVal == 1
		if reqStatus == "Đã quyết toán" && !isSettled {
			return false
		}
		if (reqStatus == "Chờ quyết toán" || reqStatus == "Chưa quyết toán") && isSettled {
			return false
		}
	}

	// 6. FactoryName
	if strings.TrimSpace(req.FactoryName) != "" && !isAllValue(req.FactoryName) {
		target := strings.ToLower(strings.TrimSpace(req.FactoryName))
		factory := strings.ToLower(bravo.GetStringField(row, "FactoryCodeTT", "FactoryName"))
		if !strings.Contains(factory, target) {
			return false
		}
	}

	return true
}


func (s *OrderSettlementService) resolveValidToken(ctx context.Context, configKey, username, token string) (string, error) {
	if strings.TrimSpace(token) != "" {
		return strings.TrimSpace(token), nil
	}
	targetUser := username
	if targetUser == "" && s.cfg != nil {
		targetUser = s.cfg.Bravo.DefaultUsername
	}
	if targetUser != "" {
		session, err := s.loginService.GetTokenSession(ctx, configKey, targetUser)
		if err == nil && session != nil && session.AccessToken != "" {
			return session.AccessToken, nil
		}
	}
	return "", fmt.Errorf("active ERP access token/session not found for user '%s'", targetUser)
}

func extractUserIdFromToken(tokenStr string) int {
	parts := strings.Split(tokenStr, ".")
	if len(parts) >= 2 {
		payload := parts[1]
		// Handle base64 padding
		if l := len(payload) % 4; l > 0 {
			payload += strings.Repeat("=", 4-l)
		}
		payloadBytes, err := base64.URLEncoding.DecodeString(payload)
		if err != nil {
			payloadBytes, err = base64.RawURLEncoding.DecodeString(parts[1])
		}
		if err == nil {
			var claims struct {
				Sub string `json:"sub"`
			}
			if err := json.Unmarshal(payloadBytes, &claims); err == nil && claims.Sub != "" {
				subParts := strings.Split(claims.Sub, "|")
				if len(subParts) > 0 {
					if id, err := strconv.Atoi(subParts[0]); err == nil && id > 0 {
						return id
					}
				}
			}
		}
	}
	return 1688
}

