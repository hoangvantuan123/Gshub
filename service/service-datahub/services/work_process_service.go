package services

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

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
		logger:        logger,
	}
}

// GetWorkProcess executes the 3-step Bravo ERP workflow for Lệnh công đoạn
func (s *WorkProcessService) GetWorkProcess(
	ctx context.Context,
	clientIP, userAgent string,
	req *models.WorkProcessRequest,
) (*models.WorkProcessResult, error) {
	traceID := uuid.New().String()
	startTime := time.Now()

	// Normalize defaults
	if req.ConfigKey == "" {
		req.ConfigKey = "BravoDefault"
	}
	if req.BranchCode == "" {
		req.BranchCode = "A01"
	}
	if req.FiscalYear == "" {
		req.FiscalYear = fmt.Sprintf("%d", time.Now().Year())
	}
	if req.Endpoint == "" {
		req.Endpoint = "4e9b7232116b4a4af1b990d81e00a049"
	}
	fetchSteps := true
	if req.FetchSteps != nil {
		fetchSteps = *req.FetchSteps
	}

	// 1. Get ERP Config
	erpCfg, err := s.configService.GetConfigByKey(ctx, req.ConfigKey)
	if err != nil {
		return nil, fmt.Errorf("failed to load ERP config '%s': %w", req.ConfigKey, err)
	}

	// 2. Resolve Active Token
	token, err := s.resolveValidToken(ctx, clientIP, userAgent, req.ConfigKey, req.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to obtain ERP access token: %w", err)
	}

	// HTTP Client
	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: erpCfg.InsecureSkipVerify,
			},
		},
		Timeout: 35 * time.Second,
	}

	targetURL := fmt.Sprintf("%s/%s", strings.TrimRight(erpCfg.BaseApiUrl, "/"), strings.TrimLeft(req.Endpoint, "/"))

	rawResponses := make(map[string]interface{})

	// ----------------------------------------------------------------------------------
	// STEP 1: Query Master (Ct - vB30WorkProcess_Explorer)
	// ----------------------------------------------------------------------------------
	masterPayload := s.buildMasterPayload(req)
	masterRespBytes, err := s.doErpPost(ctx, httpClient, targetURL, token, req.BranchCode, req.FiscalYear, erpCfg.Referer, clientIP, userAgent, masterPayload)
	if err != nil {
		s.logger.Error("Step 1 failed: vB30WorkProcess_Explorer", zap.Error(err), zap.String("trace_id", traceID))
		return nil, fmt.Errorf("step 1 (master header) query failed: %w", err)
	}

	if req.IncludeRaw {
		var raw1 interface{}
		_ = json.Unmarshal(masterRespBytes, &raw1)
		rawResponses["step1_master"] = raw1
	}

	masterRows := s.extractRows(masterRespBytes)
	s.logger.Debug("Step 1 master rows retrieved", zap.Int("count", len(masterRows)))

	var items []models.WorkProcessItem
	totalDetails := 0
	totalSteps := 0

	// ----------------------------------------------------------------------------------
	// STEP 2 & 3: Query Details & TT Steps for each Master Record
	// ----------------------------------------------------------------------------------
	for _, masterRow := range masterRows {
		// In Bravo Master, Stt holds the document code e.g. "11375541CD"
		masterID := s.getStringField(masterRow, "Stt", "Id", "id", "ID", "RowId")
		if masterID == "" {
			// If no ID found, still keep master without details
			items = append(items, models.WorkProcessItem{
				Master:  masterRow,
				Details: []models.WorkProcessDetail{},
			})
			continue
		}

		// Query Step 2 (ChildTable_Detail - vB30WorkProcessDetail_Explorer)
		detailPayload := s.buildDetailPayload(masterID, req)
		detailRespBytes, err := s.doErpPost(ctx, httpClient, targetURL, token, req.BranchCode, req.FiscalYear, erpCfg.Referer, clientIP, userAgent, detailPayload)
		if err != nil {
			s.logger.Warn("Step 2 detail query failed for master", zap.String("master_id", masterID), zap.Error(err))
			items = append(items, models.WorkProcessItem{
				Master:  masterRow,
				Details: []models.WorkProcessDetail{},
			})
			continue
		}

		if req.IncludeRaw {
			var raw2 interface{}
			_ = json.Unmarshal(detailRespBytes, &raw2)
			rawResponses[fmt.Sprintf("step2_detail_%s", masterID)] = raw2
		}

		detailRows := s.extractRows(detailRespBytes)
		totalDetails += len(detailRows)

		var detailsWithSteps []models.WorkProcessDetail

		if !fetchSteps || len(detailRows) == 0 {
			for _, dRow := range detailRows {
				detailsWithSteps = append(detailsWithSteps, models.WorkProcessDetail{
					Detail: dRow,
					Steps:  []map[string]interface{}{},
				})
			}
		} else {
			// Step 3: Concurrently fetch TT Steps (detailtt - vB30WorkProcessDetailTT) for each detail row
			type stepFetchResult struct {
				index int
				steps []map[string]interface{}
				raw   interface{}
				err   error
			}

			resultsChan := make(chan stepFetchResult, len(detailRows))
			var wg sync.WaitGroup

			for idx, dRow := range detailRows {
				// In Bravo Detail, RowId holds the detail item code e.g. "12263167CD"
				detailID := s.getStringField(dRow, "RowId", "RowId_CD", "Id", "id", "Stt")
				if detailID == "" {
					resultsChan <- stepFetchResult{index: idx, steps: []map[string]interface{}{}}
					continue
				}

				wg.Add(1)
				go func(i int, dtID string) {
					defer wg.Done()
					stepPayload := s.buildStepPayload(dtID)
					stepRespBytes, stepErr := s.doErpPost(ctx, httpClient, targetURL, token, req.BranchCode, req.FiscalYear, erpCfg.Referer, clientIP, userAgent, stepPayload)
					if stepErr != nil {
						s.logger.Warn("Step 3 TT query failed", zap.String("detail_id", dtID), zap.Error(stepErr))
						resultsChan <- stepFetchResult{index: i, steps: []map[string]interface{}{}, err: stepErr}
						return
					}

					var raw3 interface{}
					if req.IncludeRaw {
						_ = json.Unmarshal(stepRespBytes, &raw3)
					}

					stepRows := s.extractRows(stepRespBytes)
					resultsChan <- stepFetchResult{
						index: i,
						steps: stepRows,
						raw:   raw3,
					}
				}(idx, detailID)
			}

			wg.Wait()
			close(resultsChan)

			// Map steps back to detail rows in exact order
			stepsMap := make(map[int][]map[string]interface{})
			for res := range resultsChan {
				stepsMap[res.index] = res.steps
				totalSteps += len(res.steps)
				if req.IncludeRaw && res.raw != nil {
					rawResponses[fmt.Sprintf("step3_steps_detail_%d", res.index)] = res.raw
				}
			}

			for idx, dRow := range detailRows {
				detailsWithSteps = append(detailsWithSteps, models.WorkProcessDetail{
					Detail: dRow,
					Steps:  stepsMap[idx],
				})
			}
		}

		items = append(items, models.WorkProcessItem{
			Master:  masterRow,
			Details: detailsWithSteps,
		})
	}

	result := &models.WorkProcessResult{
		DocNo:       req.DocNo,
		TotalMaster: len(items),
		TotalDetail: totalDetails,
		TotalSteps:  totalSteps,
		Data:        items,
	}
	if req.IncludeRaw {
		result.Raw = rawResponses
	}

	s.logger.Info("WorkProcess completed successfully",
		zap.String("doc_no", req.DocNo),
		zap.Int("masters", len(items)),
		zap.Int("details", totalDetails),
		zap.Int("steps", totalSteps),
		zap.Int64("latency_ms", time.Since(startTime).Milliseconds()),
	)

	return result, nil
}

// GetWorkProcessSteps queries TT steps on demand for a single stage order (Step 3)
func (s *WorkProcessService) GetWorkProcessSteps(
	ctx context.Context,
	clientIP, userAgent string,
	req *models.WorkProcessStepsRequest,
) ([]map[string]interface{}, error) {
	if req.ConfigKey == "" {
		req.ConfigKey = "BravoDefault"
	}
	if req.BranchCode == "" {
		req.BranchCode = "A01"
	}
	if req.FiscalYear == "" {
		req.FiscalYear = fmt.Sprintf("%d", time.Now().Year())
	}
	if req.Endpoint == "" {
		req.Endpoint = "4e9b7232116b4a4af1b990d81e00a049"
	}
	if req.RowID == "" {
		return []map[string]interface{}{}, nil
	}

	erpCfg, err := s.configService.GetConfigByKey(ctx, req.ConfigKey)
	if err != nil {
		return nil, fmt.Errorf("failed to load ERP config '%s': %w", req.ConfigKey, err)
	}

	token, err := s.resolveValidToken(ctx, clientIP, userAgent, req.ConfigKey, req.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to obtain ERP access token: %w", err)
	}

	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: erpCfg.InsecureSkipVerify,
			},
		},
		Timeout: 30 * time.Second,
	}

	targetURL := fmt.Sprintf("%s/%s", strings.TrimRight(erpCfg.BaseApiUrl, "/"), strings.TrimLeft(req.Endpoint, "/"))
	stepPayload := s.buildStepPayload(req.RowID)

	stepRespBytes, err := s.doErpPost(ctx, httpClient, targetURL, token, req.BranchCode, req.FiscalYear, erpCfg.Referer, clientIP, userAgent, stepPayload)
	if err != nil {
		s.logger.Warn("GetWorkProcessSteps query failed", zap.String("row_id", req.RowID), zap.Error(err))
		return nil, fmt.Errorf("query TT steps failed: %w", err)
	}

	stepRows := s.extractRows(stepRespBytes)
	return stepRows, nil
}

// resolveValidToken gets cached token session or performs automatic authentication
func (s *WorkProcessService) resolveValidToken(ctx context.Context, clientIP, userAgent, configKey, username string) (string, error) {
	targetUser := username
	if targetUser == "" {
		targetUser = s.cfg.Bravo.DefaultUsername
	}

	// 1. Try finding active session
	session, err := s.loginService.GetTokenSession(ctx, configKey, targetUser)
	if err == nil && session != nil && session.AccessToken != "" {
		return session.AccessToken, nil
	}

	// 2. If no active session, attempt auto-login using default credentials if user is default
	if targetUser == s.cfg.Bravo.DefaultUsername && s.cfg.Bravo.DefaultPassword != "" {
		s.logger.Info("No active token session found. Performing auto-login to ERP...", zap.String("username", targetUser))
		loginResp, loginErr := s.loginService.Login(ctx, clientIP, userAgent, &models.LoginRequest{
			Username:  targetUser,
			Password:  s.cfg.Bravo.DefaultPassword,
			ConfigKey: configKey,
		})
		if loginErr != nil {
			return "", fmt.Errorf("auto-login failed: %w", loginErr)
		}
		return loginResp.AccessToken, nil
	}

	return "", fmt.Errorf("active session not found for user '%s'. Please login first", targetUser)
}

// doErpPost performs HTTP POST to Bravo ERP with appropriate headers
func (s *WorkProcessService) doErpPost(
	ctx context.Context,
	client *http.Client,
	url, token, branchCode, fiscalYear, referer, clientIP, userAgent string,
	payload interface{},
) ([]byte, error) {
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("payload serialization error: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("request creation error: %w", err)
	}

	// 1. Auth & Content-Type
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json, text/plain, */*")
	httpReq.Header.Set("Lang", "0")
	httpReq.Header.Set("FiscalYear", fiscalYear)
	httpReq.Header.Set("BranchCode", branchCode)

	// 2. ClientInfo: Dynamically set workstation name / client IP
	wsName := clientIP
	if wsName == "" || wsName == "::1" || wsName == "127.0.0.1" {
		wsName = "10.10.9.66"
	}
	httpReq.Header.Set("clientinfo", fmt.Sprintf("AppName=Bravo Web 10.9.5.1;WsName=%s", wsName))

	// 3. User-Agent: Dynamically use client's User-Agent if provided
	ua := userAgent
	if ua == "" {
		ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36"
	}
	httpReq.Header.Set("User-Agent", ua)

	// 4. Referer
	if referer != "" {
		httpReq.Header.Set("Referer", referer)
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body failed: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return respBytes, fmt.Errorf("ERP returned HTTP status %d: %s", resp.StatusCode, string(respBytes))
	}

	return respBytes, nil
}

// extractRows converts flexible Bravo JSON responses (including rtv.cln + rtv.rws) into slice of records
func (s *WorkProcessService) extractRows(raw []byte) []map[string]interface{} {
	if len(raw) == 0 {
		return []map[string]interface{}{}
	}

	// Case 1: Bravo Web ERP format { "rtv": { "cln": [...], "rws": [ { "crt": [...] } ] } }
	var bravoRtv struct {
		Rtv struct {
			Cln []struct {
				Cln string `json:"cln"`
			} `json:"cln"`
			Rws []struct {
				Crt []interface{} `json:"crt"`
			} `json:"rws"`
		} `json:"rtv"`
	}
	if err := json.Unmarshal(raw, &bravoRtv); err == nil && len(bravoRtv.Rtv.Cln) > 0 {
		colNames := make([]string, len(bravoRtv.Rtv.Cln))
		for i, c := range bravoRtv.Rtv.Cln {
			colNames[i] = c.Cln
		}

		var res []map[string]interface{}
		for _, r := range bravoRtv.Rtv.Rws {
			rowMap := make(map[string]interface{})
			for i, val := range r.Crt {
				if i < len(colNames) {
					rowMap[colNames[i]] = val
				}
			}
			res = append(res, rowMap)
		}
		return res
	}

	// Case 2: Direct Array [ {...}, {...} ]
	var arr []map[string]interface{}
	if err := json.Unmarshal(raw, &arr); err == nil {
		return arr
	}

	// Case 3: Direct Array of interfaces
	var arrGeneric []interface{}
	if err := json.Unmarshal(raw, &arrGeneric); err == nil {
		var res []map[string]interface{}
		for _, item := range arrGeneric {
			if m, ok := item.(map[string]interface{}); ok {
				res = append(res, m)
			}
		}
		return res
	}

	// Case 4: Object containing data/rows/result/records/Result
	var obj map[string]interface{}
	if err := json.Unmarshal(raw, &obj); err == nil {
		for _, key := range []string{"data", "rows", "Rows", "Data", "result", "Result", "records", "Records", "items", "Items"} {
			if val, exists := obj[key]; exists {
				if list, ok := val.([]interface{}); ok {
					var res []map[string]interface{}
					for _, item := range list {
						if m, ok := item.(map[string]interface{}); ok {
							res = append(res, m)
						}
					}
					return res
				}
				if nestedObj, ok := val.(map[string]interface{}); ok {
					for _, subKey := range []string{"rows", "Rows", "data", "Data", "records"} {
						if subVal, subExists := nestedObj[subKey]; subExists {
							if subList, ok := subVal.([]interface{}); ok {
								var res []map[string]interface{}
								for _, item := range subList {
									if m, ok := item.(map[string]interface{}); ok {
										res = append(res, m)
									}
								}
								return res
							}
						}
					}
				}
			}
		}

		// If object itself represents a single row, return it
		if len(obj) > 0 {
			return []map[string]interface{}{obj}
		}
	}

	return []map[string]interface{}{}
}

func (s *WorkProcessService) getStringField(row map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if val, exists := row[k]; exists && val != nil {
			strVal := fmt.Sprintf("%v", val)
			if strVal != "" && strVal != "<nil>" {
				return strVal
			}
		}
	}
	return ""
}

// isAscii checks if a string contains only ASCII characters
func isAscii(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] > 127 {
			return false
		}
	}
	return true
}

// buildBravoColExpr builds a LIKE AST expression for a column in Bravo ERP
func (s *WorkProcessService) buildBravoColExpr(fieldName, rawVal string) map[string]interface{} {
	val := strings.TrimSpace(rawVal)
	if val == "" {
		return nil
	}

	fieldNullWrap := map[string]interface{}{
		"opr": 35,
		"val": nil,
		"eps": []interface{}{
			map[string]interface{}{
				"opr": 11,
				"eps": []interface{}{
					map[string]interface{}{"opr": 4, "val": fieldName},
					map[string]interface{}{"opr": 4, "val": "''"},
				},
			},
		},
	}

	if isAscii(val) {
		valPattern := fmt.Sprintf("'%%%s%%'", val)
		likeExpr := map[string]interface{}{
			"opr": 25,
			"eps": []interface{}{
				fieldNullWrap,
				map[string]interface{}{"opr": 4, "val": valPattern},
			},
		}
		return map[string]interface{}{
			"opr": 175,
			"eps": []interface{}{
				likeExpr,
				map[string]interface{}{"opr": 4, "val": "LATIN1_GENERAL_CI_AI"},
			},
		}
	}

	// Non-ASCII (Vietnamese Unicode)
	valPattern := fmt.Sprintf("N'%%%s%%'", val)
	return map[string]interface{}{
		"opr": 25,
		"eps": []interface{}{
			fieldNullWrap,
			map[string]interface{}{"opr": 4, "val": valPattern},
		},
	}
}

// combineWithOr combines multiple expressions with OR (opr: 24)
func combineWithOr(exprs []map[string]interface{}) map[string]interface{} {
	if len(exprs) == 0 {
		return nil
	}
	if len(exprs) == 1 {
		return exprs[0]
	}
	res := exprs[0]
	for i := 1; i < len(exprs); i++ {
		res = map[string]interface{}{
			"opr": 24,
			"eps": []interface{}{res, exprs[i]},
		}
	}
	return res
}

// combineWithAnd combines multiple expressions with AND (opr: 23)
func combineWithAnd(exprs []map[string]interface{}) map[string]interface{} {
	if len(exprs) == 0 {
		return nil
	}
	if len(exprs) == 1 {
		return exprs[0]
	}
	res := exprs[0]
	for i := 1; i < len(exprs); i++ {
		res = map[string]interface{}{
			"opr": 23,
			"eps": []interface{}{res, exprs[i]},
		}
	}
	return res
}

func splitValues(input string) []string {
	if strings.TrimSpace(input) == "" {
		return nil
	}
	parts := strings.FieldsFunc(input, func(r rune) bool {
		return r == ',' || r == ';' || r == '|'
	})
	var res []string
	for _, p := range parts {
		if tr := strings.TrimSpace(p); tr != "" {
			res = append(res, tr)
		}
	}
	if len(res) == 0 && strings.TrimSpace(input) != "" {
		return []string{strings.TrimSpace(input)}
	}
	return res
}

// buildDynamicFilterTree constructs the full Bravo AST expression tree from WorkProcessRequest
func (s *WorkProcessService) buildDynamicFilterTree(req *models.WorkProcessRequest) map[string]interface{} {
	if req == nil {
		return nil
	}

	var fieldConditions []map[string]interface{}

	// 1. DocNo / StageOrderNo
	if strings.TrimSpace(req.DocNo) != "" {
		docVals := splitValues(req.DocNo)
		var orExprs []map[string]interface{}
		for _, v := range docVals {
			if expr := s.buildBravoColExpr("DocNo_Detail", v); expr != nil {
				orExprs = append(orExprs, expr)
			}
		}
		if orNode := combineWithOr(orExprs); orNode != nil {
			fieldConditions = append(fieldConditions, orNode)
		}
	}

	// 2. ItemCode / ItemCodes
	var itemCodeVals []string
	if strings.TrimSpace(req.ItemCode) != "" {
		itemCodeVals = append(itemCodeVals, splitValues(req.ItemCode)...)
	}
	itemCodeVals = append(itemCodeVals, req.ItemCodes...)
	if len(itemCodeVals) > 0 {
		var orExprs []map[string]interface{}
		for _, v := range itemCodeVals {
			if expr := s.buildBravoColExpr("ItemCode", v); expr != nil {
				orExprs = append(orExprs, expr)
			}
		}
		if orNode := combineWithOr(orExprs); orNode != nil {
			fieldConditions = append(fieldConditions, orNode)
		}
	}

	// 3. ItemName / ItemNames
	var itemNameVals []string
	if strings.TrimSpace(req.ItemName) != "" {
		itemNameVals = append(itemNameVals, splitValues(req.ItemName)...)
	}
	itemNameVals = append(itemNameVals, req.ItemNames...)
	if len(itemNameVals) > 0 {
		var orExprs []map[string]interface{}
		for _, v := range itemNameVals {
			if expr := s.buildBravoColExpr("ItemName", v); expr != nil {
				orExprs = append(orExprs, expr)
			}
		}
		if orNode := combineWithOr(orExprs); orNode != nil {
			fieldConditions = append(fieldConditions, orNode)
		}
	}

	// 4. Unit
	if strings.TrimSpace(req.Unit) != "" {
		unitVals := splitValues(req.Unit)
		var orExprs []map[string]interface{}
		for _, v := range unitVals {
			if expr := s.buildBravoColExpr("Unit", v); expr != nil {
				orExprs = append(orExprs, expr)
			}
		}
		if orNode := combineWithOr(orExprs); orNode != nil {
			fieldConditions = append(fieldConditions, orNode)
		}
	}

	// 5. CustomerName
	if strings.TrimSpace(req.CustomerName) != "" {
		custVals := splitValues(req.CustomerName)
		var orExprs []map[string]interface{}
		for _, v := range custVals {
			if expr := s.buildBravoColExpr("CustomerName", v); expr != nil {
				orExprs = append(orExprs, expr)
			}
		}
		if orNode := combineWithOr(orExprs); orNode != nil {
			fieldConditions = append(fieldConditions, orNode)
		}
	}

	// 6. Description
	if strings.TrimSpace(req.Description) != "" {
		descVals := splitValues(req.Description)
		var orExprs []map[string]interface{}
		for _, v := range descVals {
			if expr := s.buildBravoColExpr("Description", v); expr != nil {
				orExprs = append(orExprs, expr)
			}
		}
		if orNode := combineWithOr(orExprs); orNode != nil {
			fieldConditions = append(fieldConditions, orNode)
		}
	}

	// 7. Generic ColumnFilters map[string]interface{}
	for col, val := range req.ColumnFilters {
		colName := strings.TrimSpace(col)
		if colName == "" {
			continue
		}
		var vals []string
		switch v := val.(type) {
		case string:
			vals = splitValues(v)
		case []string:
			vals = v
		case []interface{}:
			for _, item := range v {
				if sVal, ok := item.(string); ok {
					vals = append(vals, sVal)
				}
			}
		}
		if len(vals) > 0 {
			var orExprs []map[string]interface{}
			for _, v := range vals {
				if expr := s.buildBravoColExpr(colName, v); expr != nil {
					orExprs = append(orExprs, expr)
				}
			}
			if orNode := combineWithOr(orExprs); orNode != nil {
				fieldConditions = append(fieldConditions, orNode)
			}
		}
	}

	return combineWithAnd(fieldConditions)
}

// buildMasterPayload constructs Payload 1 for vB30WorkProcess_Explorer
func (s *WorkProcessService) buildMasterPayload(req *models.WorkProcessRequest) map[string]interface{} {
	branchCode := "A01"
	if req != nil && req.BranchCode != "" {
		branchCode = req.BranchCode
	}
	branchFilter := fmt.Sprintf("ISNULL(BranchCode,'') IN ('','%s')", branchCode)

	masterFieldNames := []string{
		"DocNo", "DocDate", "DocStatus", "DocCode", "PostSL", "WorkProcessCode",
		"ProductTypeName", "Description", "IsCheckSample", "FactoryName", "CustomerName",
		"CreatedBy_Name", "CreatedAt", "ItemCode", "ItemName", "Quantity", "Id",
		"Stt", "CreatedBy", "ModifiedBy", "ModifiedAt",
	}
	fcle := s.buildNestedFcle(masterFieldNames)

	var sseMap map[string]interface{}
	if req != nil && len(req.RawSSE) > 0 {
		sseMap = req.RawSSE
	} else if req != nil {
		filterTree := s.buildDynamicFilterTree(req)
		if filterTree != nil {
			sseMap = map[string]interface{}{
				"dss": map[string]interface{}{
					"ChildTable_Detail": []map[string]interface{}{filterTree},
				},
			}
		}
	}

	payload := map[string]interface{}{
		"ipo":  false,
		"san":  "Ct",
		"stn":  "vB30WorkProcess_Explorer",
		"alc":  "CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher",
		"ndcn": "_NoDelete_gim00a",
		"nocn": "_NoOpen_esjp5f",
		"necn": "_NoEdit_tc393n",
		"nrcn": "_NoRecall_voxx2",
		"lst":  0,
		"tpid": "ParentId",
		"pnb":  0,
		"vlm":  nil,
		"iis":  false,
		"fit": []map[string]interface{}{
			{
				"opr": 23,
				"eps": []map[string]interface{}{
					{
						"opr": 17,
						"eps": []interface{}{
							map[string]interface{}{
								"opr": 14,
								"eps": []map[string]interface{}{
									{"opr": 4, "val": "Ct"},
									{"opr": 4, "val": "IsGroup"},
								},
							},
							map[string]interface{}{"opr": 4, "val": 0},
						},
					},
					{
						"opr": 17,
						"eps": []interface{}{
							map[string]interface{}{
								"opr": 14,
								"eps": []map[string]interface{}{
									{"opr": 4, "val": "Ct"},
									{"opr": 4, "val": "IsActive"},
								},
							},
							map[string]interface{}{"opr": 4, "val": 1},
						},
					},
				},
			},
		},
		"sot": []map[string]interface{}{
			{"opr": 4, "val": "DocStatus"},
		},
		"fcle": fcle,
		"lps": map[string]interface{}{
			"BRANCHFILTER('BranchCode')": branchFilter,
		},
		"pkv": nil,
	}

	if sseMap != nil {
		payload["sse"] = sseMap
	}

	return payload
}

// buildDetailPayload constructs Payload 2 for vB30WorkProcessDetail_Explorer
func (s *WorkProcessService) buildDetailPayload(masterID string, req *models.WorkProcessRequest) map[string]interface{} {
	branchCode := "A01"
	if req != nil && req.BranchCode != "" {
		branchCode = req.BranchCode
	}
	branchFilter := fmt.Sprintf("ISNULL(BranchCode,'') IN ('','%s')", branchCode)

	fieldNames := []string{
		"DocNo_Detail", "DocNoR", "ItemCode", "ItemName", "Unit",
		"QuantitySO", "QuantityCDIssue", "QuantityPass", "AllowAdj", "QuantityAdj",
		"QuantityAfterAdj", "QuantityOff", "QuantityProduce", "Closed", "IsStop",
		"IsComplete", "QuantityReceipt", "RateReceipt", "DeliveryDateDO", "ClosedDate",
		"RowId_SO", "CustomerName", "RowId", "Stt", "Id", "CreatedBy", "CreatedAt",
		"ModifiedBy", "ModifiedAt",
	}
	fcle := s.buildNestedFcle(fieldNames)

	var sseMap map[string]interface{}
	if req != nil && len(req.RawSSE) > 0 {
		sseMap = req.RawSSE
	} else if req != nil {
		filterTree := s.buildDynamicFilterTree(req)
		if filterTree != nil {
			sseMap = map[string]interface{}{
				"dss": map[string]interface{}{
					"ChildTable_Detail": []map[string]interface{}{filterTree},
				},
			}
		}
	}

	payload := map[string]interface{}{
		"ipo":  false,
		"san":  "ChildTable_Detail",
		"stn":  "vB30WorkProcessDetail_Explorer",
		"alc":  "CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher",
		"ndcn": "_NoDelete_in55v",
		"nocn": "_NoOpen_osvfze",
		"necn": "_NoEdit_z1dhnu",
		"nrcn": "_NoRecall_a48pk",
		"lst":  0,
		"tpid": "ParentId",
		"pnb":  0,
		"vlm":  nil,
		"iis":  false,
		"sot": []map[string]interface{}{
			{
				"opr": 4,
				"val": "DocNo_Detail",
				"atb": []map[string]interface{}{
					{"opr": 4, "val": "DESC"},
				},
			},
		},
		"fcle": fcle,
		"lps": map[string]interface{}{
			"BRANCHFILTER('BranchCode')": branchFilter,
		},
		"pkv": []string{masterID},
	}

	if sseMap != nil {
		payload["sse"] = sseMap
	}

	return payload
}

// buildStepPayload constructs Payload 3 for vB30WorkProcessDetailTT
func (s *WorkProcessService) buildStepPayload(detailID string) map[string]interface{} {
	fieldNames := []string{
		"BuiltinOrder", "WorkStepCode", "WorkStepTypeCode", "WorkStepTypeName",
		"QuantityPass", "QuantityProduce", "QuantityTransfered", "QuantityProductTransfered",
		"QuantityPassTK", "QuantityProduceTK", "MachineCode", "MachineName",
		"FactoryName", "FactoryList", "BuiltinOrderDESC", "RowId_CD", "Id",
		"CreatedBy", "CreatedAt", "ModifiedBy", "ModifiedAt",
	}

	fcle := s.buildNestedFcle(fieldNames)

	return map[string]interface{}{
		"ipo":  false,
		"san":  "detailtt",
		"stn":  "vB30WorkProcessDetailTT",
		"alc":  "CommandKey=WorkDocCD|LayoutName=Layout1|TemplateName=StatsDocVoucher",
		"ndcn": "_NoDelete_f5wtei",
		"nocn": "_NoOpen_p09uzi",
		"necn": "_NoEdit_254kf",
		"nrcn": "_NoRecall_1pph2",
		"lst":  0,
		"tpid": "ParentId",
		"pnb":  0,
		"vlm":  nil,
		"iis":  false,
		"fcle": fcle,
		"lps":  map[string]interface{}{},
		"pkv":  []string{detailID},
		"sse":  map[string]interface{}{},
	}
}

// buildNestedFcle dynamically creates the nested Bravo binary tree structure for field lists
func (s *WorkProcessService) buildNestedFcle(fields []string) []map[string]interface{} {
	if len(fields) == 0 {
		return []map[string]interface{}{}
	}
	if len(fields) == 1 {
		return []map[string]interface{}{
			{"opr": 4, "val": fields[0]},
		}
	}

	// Base 2 elements
	var current interface{} = map[string]interface{}{
		"opr": 11,
		"eps": []interface{}{
			map[string]interface{}{"opr": 4, "val": fields[0]},
			map[string]interface{}{"opr": 4, "val": fields[1]},
		},
	}

	// Chain the rest
	for i := 2; i < len(fields); i++ {
		current = map[string]interface{}{
			"opr": 11,
			"eps": []interface{}{
				current,
				map[string]interface{}{"opr": 4, "val": fields[i]},
			},
		}
	}

	if m, ok := current.(map[string]interface{}); ok {
		return []map[string]interface{}{m}
	}
	return []map[string]interface{}{}
}
