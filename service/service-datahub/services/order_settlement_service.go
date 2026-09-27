package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"service-datahub/bravo"
	"service-datahub/config"
	"service-datahub/models"

	"go.uber.org/zap"
)

type OrderSettlementService struct {
	cfg                *config.Config
	configService      *ConfigService
	loginService       *LoginService
	workProcessService *WorkProcessService
	logger             *zap.Logger
}

func NewOrderSettlementService(
	cfg *config.Config,
	configService *ConfigService,
	loginService *LoginService,
	workProcessService *WorkProcessService,
	logger *zap.Logger,
) *OrderSettlementService {
	return &OrderSettlementService{
		cfg:                cfg,
		configService:      configService,
		loginService:       loginService,
		workProcessService: workProcessService,
		logger:             logger,
	}
}

// GetOrderSettlement queries CD and DetailTT from Bravo ERP and returns flattened settlement items matching FE data mock
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

	wpReq := &models.WorkProcessRequest{
		StageOrderNo:  req.StageOrderNo,
		ItemCode:      req.ItemCode,
		ItemCodes:     req.ItemCodes,
		ItemName:      req.ItemName,
		ItemNames:     req.ItemNames,
		FactoryName:   req.FactoryName,
		BranchCode:    req.BranchCode,
		FiscalYear:    req.FiscalYear,
		ConfigKey:     req.ConfigKey,
		Username:      req.Username,
		Token:         req.Token,
		ColumnFilters: req.ColumnFilters,
		RawSSE:        req.RawSSE,
		Page:          req.Page,
		PageSize:      req.PageSize,
		IncludeRaw:    req.IncludeRaw,
	}

	wpResult, err := s.workProcessService.GetWorkProcess(ctx, clientIP, userAgent, wpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to query work process hierarchy: %w", err)
	}

	var flatItems []models.OrderSettlementFlatItem
	rowCounter := 0

	for _, item := range wpResult.Data {
		master := item.Master
		for _, dItem := range item.Details {
			detail := dItem.Detail
			stageOrderNo := bravo.GetStringField(detail, "DocNo_Detail", "DocNo", "DocNoR", "Stt")
			if stageOrderNo == "" {
				stageOrderNo = bravo.GetStringField(master, "DocNo", "Stt")
			}

			itemCode := bravo.GetStringField(detail, "ItemCode", "ItemCodeR")
			itemName := bravo.GetStringField(detail, "ItemName", "ItemNameR")
			doReqQty := bravo.GetFloatField(detail, "QuantityPass", "QuantitySO")
			initAdjQty := bravo.GetFloatField(detail, "QuantityAdj")

			adjReqQty := doReqQty
			if initAdjQty < 0 {
				adjReqQty = doReqQty + initAdjQty
			} else if initAdjQty > 0 {
				adjReqQty = doReqQty - initAdjQty
			}

			wasteCompQty := bravo.GetFloatField(detail, "QuantityOff")
			prodReqQty := bravo.GetFloatField(detail, "QuantityProduce")
			receiptQty := bravo.GetFloatField(detail, "QuantityReceipt")

			isSettled := bravo.GetBoolField(detail, "IsComplete") || bravo.GetBoolField(detail, "Closed") || bravo.GetBoolField(master, "Closed")
			settleQty := receiptQty
			if settleQty == 0 && isSettled {
				settleQty = prodReqQty
			}

			status := "Chờ quyết toán"
			if isSettled {
				status = "Đã quyết toán"
			}

			// Filter by status if requested
			if strings.TrimSpace(req.Status) != "" && !isAllValue(req.Status) {
				reqStatus := strings.TrimSpace(req.Status)
				if reqStatus == "Đã quyết toán" && !isSettled {
					continue
				}
				if (reqStatus == "Chờ quyết toán" || reqStatus == "Chưa quyết toán") && isSettled {
					continue
				}
			}

			settledDate := bravo.GetStringField(detail, "ClosedDate", "DocDate", "ModifiedAt", "CreatedAt")
			if settledDate == "" {
				settledDate = bravo.GetStringField(master, "ClosedDate", "DocDate")
			}
			if strings.Contains(settledDate, "T") {
				settledDate = strings.Split(settledDate, "T")[0]
			}

			notes := bravo.GetStringField(detail, "Description")
			if notes == "" {
				notes = bravo.GetStringField(master, "Description")
			}
			factoryName := bravo.GetStringField(detail, "FactoryName")
			if factoryName == "" {
				factoryName = bravo.GetStringField(master, "FactoryName")
			}
			branchCode := bravo.GetStringField(detail, "BranchCode")
			if branchCode == "" {
				branchCode = bravo.GetStringField(master, "BranchCode")
			}

			// If detail has step records (TT), create 1 flat item per step
			if len(dItem.Steps) > 0 {
				for ttIdx, step := range dItem.Steps {
					opCode := bravo.GetStringField(step, "WorkStepCode")
					if strings.TrimSpace(req.OperationCode) != "" && !isAllValue(req.OperationCode) {
						if !strings.EqualFold(opCode, strings.TrimSpace(req.OperationCode)) {
							continue
						}
					}

					rowCounter++
					opName := bravo.GetStringField(step, "WorkStepName", "WorkStepTypeName")
					plannedAchieved := bravo.GetFloatField(step, "QuantityPass")
					plannedProd := bravo.GetFloatField(step, "QuantityProduce")
					statAchieved := bravo.GetFloatField(step, "QuantityPassTK")
					statProd := bravo.GetFloatField(step, "QuantityProduceTK")
					detailNo := bravo.GetStringField(step, "RowId_CD", "Id")
					if detailNo == "" {
						detailNo = fmt.Sprintf("TT_%s_%d", stageOrderNo, ttIdx+1)
					}

					flatItems = append(flatItems, models.OrderSettlementFlatItem{
						ID:                    fmt.Sprintf("row_%d", rowCounter),
						WorkingTag:            "",
						StageOrderNo:          stageOrderNo,
						ItemCode:              itemCode,
						ItemName:              itemName,
						DoRequiredQty:         doReqQty,
						InitialAdjustQty:      initAdjQty,
						AdjustedRequiredQty:   adjReqQty,
						WasteCompensationQty:  wasteCompQty,
						ProductionRequiredQty: prodReqQty,
						IsSettled:             isSettled,
						SettlementQty:         settleQty,
						DetailNo:              detailNo,
						OperationCode:         opCode,
						OperationName:         opName,
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
					})
				}
			} else {
				// Fallback: 1 flat item for CD detail row without TT steps
				if strings.TrimSpace(req.OperationCode) != "" && !isAllValue(req.OperationCode) {
					continue
				}

				rowCounter++
				flatItems = append(flatItems, models.OrderSettlementFlatItem{
					ID:                    fmt.Sprintf("row_%d", rowCounter),
					WorkingTag:            "",
					StageOrderNo:          stageOrderNo,
					ItemCode:              itemCode,
					ItemName:              itemName,
					DoRequiredQty:         doReqQty,
					InitialAdjustQty:      initAdjQty,
					AdjustedRequiredQty:   adjReqQty,
					WasteCompensationQty:  wasteCompQty,
					ProductionRequiredQty: prodReqQty,
					IsSettled:             isSettled,
					SettlementQty:         settleQty,
					DetailNo:              stageOrderNo,
					OperationCode:         "",
					OperationName:         "",
					PlannedAchievedQty:    0,
					PlannedProductionQty:  0,
					StatAchievedQty:       0,
					StatProductionQty:     0,
					WarehouseReceiptQty:   receiptQty,
					Status:                status,
					SettledDate:           settledDate,
					Notes:                 notes,
					FactoryName:           factoryName,
					BranchCode:            branchCode,
				})
			}
		}
	}

	latency := time.Since(startTime).Milliseconds()

	return &models.OrderSettlementResponse{
		Items:      flatItems,
		TotalCount: len(flatItems),
		Page:       req.Page,
		PageSize:   len(flatItems),
		HasMore:    false,
		Latency:    latency,
		Raw:        wpResult.Raw,
	}, nil
}
