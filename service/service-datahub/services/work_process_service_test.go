package services

import (
	"encoding/json"
	"testing"

	"service-datahub/models"
)

func TestPayloadGeneration(t *testing.T) {
	s := &WorkProcessService{}

	req := &models.WorkProcessRequest{
		DocNo:      "CD05-0926-0009",
		ItemCodes:  []string{"FIN-PFB-", "FIN"},
		ItemName:   "Tờ in - D01X",
		Unit:       "pcs",
		BranchCode: "A01",
	}

	// Test Master Payload
	masterPayload := s.buildMasterPayload(req)
	if masterPayload["san"] != "Ct" {
		t.Fatalf("expected san Ct, got %v", masterPayload["san"])
	}
	if masterPayload["stn"] != "vB30WorkProcess_Explorer" {
		t.Fatalf("expected stn vB30WorkProcess_Explorer, got %v", masterPayload["stn"])
	}
	if masterPayload["sse"] == nil {
		t.Fatalf("expected sse filter in master payload")
	}

	masterBytes, err := json.Marshal(masterPayload)
	if err != nil {
		t.Fatalf("failed to marshal master payload: %v", err)
	}
	if len(masterBytes) == 0 {
		t.Fatalf("empty master payload bytes")
	}

	// Test Detail Payload
	detailPayload := s.buildDetailPayload("11375541CD", req)
	if detailPayload["san"] != "ChildTable_Detail" {
		t.Fatalf("expected san ChildTable_Detail, got %v", detailPayload["san"])
	}
	if detailPayload["stn"] != "vB30WorkProcessDetail_Explorer" {
		t.Fatalf("expected stn vB30WorkProcessDetail_Explorer, got %v", detailPayload["stn"])
	}
	if detailPayload["sse"] == nil {
		t.Fatalf("expected sse filter in detail payload")
	}

	// Test Step Payload
	stepPayload := s.buildStepPayload("12263167CD")
	if stepPayload["san"] != "detailtt" {
		t.Fatalf("expected san detailtt, got %v", stepPayload["san"])
	}
	if stepPayload["stn"] != "vB30WorkProcessDetailTT" {
		t.Fatalf("expected stn vB30WorkProcessDetailTT, got %v", stepPayload["stn"])
	}
}

func TestBravoRtvParsing(t *testing.T) {
	s := &WorkProcessService{}

	// Step 1: Master response json
	rawMaster := []byte(`{
		"rtv": {
			"cln": [
				{"cln": "Id"},
				{"cln": "ParentId"},
				{"cln": "IsGroup"},
				{"cln": "BranchCode"},
				{"cln": "Stt"},
				{"cln": "DocCode"},
				{"cln": "DocNo"}
			],
			"rws": [
				{
					"crt": [
						17356,
						-56881,
						0,
						"A01",
						"11375541CD",
						"CD",
						"CD05-0926-0009"
					]
				}
			]
		}
	}`)

	masterRows := s.extractRows(rawMaster)
	if len(masterRows) != 1 {
		t.Fatalf("expected 1 master row, got %d", len(masterRows))
	}
	if masterRows[0]["DocNo"] != "CD05-0926-0009" {
		t.Fatalf("expected DocNo CD05-0926-0009, got %v", masterRows[0]["DocNo"])
	}
	masterID := s.getStringField(masterRows[0], "Stt", "Id", "RowId")
	if masterID != "11375541CD" {
		t.Fatalf("expected masterID 11375541CD, got %s", masterID)
	}

	// Step 2: Detail response json
	rawDetail := []byte(`{
		"rtv": {
			"cln": [
				{"cln": "DocNo_Detail"},
				{"cln": "ItemCode"},
				{"cln": "ItemName"},
				{"cln": "Unit"},
				{"cln": "RowId"},
				{"cln": "Stt"},
				{"cln": "Id"}
			],
			"rws": [
				{
					"crt": [
						"CD05-0926-0009(019)",
						"CAN-2BO-00013",
						"RX1-4058-000",
						"Pcs",
						"12263167CD",
						"11375541CD",
						182019
					]
				}
			]
		}
	}`)

	detailRows := s.extractRows(rawDetail)
	if len(detailRows) != 1 {
		t.Fatalf("expected 1 detail row, got %d", len(detailRows))
	}
	if detailRows[0]["ItemCode"] != "CAN-2BO-00013" {
		t.Fatalf("expected ItemCode CAN-2BO-00013, got %v", detailRows[0]["ItemCode"])
	}
	detailID := s.getStringField(detailRows[0], "RowId", "RowId_CD", "Id")
	if detailID != "12263167CD" {
		t.Fatalf("expected detailID 12263167CD, got %s", detailID)
	}

	// Step 3: Steps TT response json
	rawSteps := []byte(`{
		"rtv": {
			"cln": [
				{"cln": "Id"},
				{"cln": "BuiltinOrder"},
				{"cln": "RowId_CD"},
				{"cln": "WorkStepTypeCode"},
				{"cln": "WorkStepTypeName"},
				{"cln": "WorkStepCode"}
			],
			"rws": [
				{"crt": [493363, 1, "12263167CD", "BE-07", "Thao tác bế sóng", "BE"]},
				{"crt": [493362, 2, "12263167CD", "BOCLE-01", "Thao tác bóc bế thủ công", "BOCLE"]},
				{"crt": [493361, 3, "12263167CD", "KIEM-06", "Thao tác kiểm sau bế", "KIEM"]},
				{"crt": [493360, 4, "12263167CD", "DONGGOI-01", "Thao tác đóng gói sản phẩm", "DONGGOI"]}
			]
		}
	}`)

	stepRows := s.extractRows(rawSteps)
	if len(stepRows) != 4 {
		t.Fatalf("expected 4 steps rows, got %d", len(stepRows))
	}
	if stepRows[0]["WorkStepCode"] != "BE" || stepRows[3]["WorkStepCode"] != "DONGGOI" {
		t.Fatalf("expected steps BE and DONGGOI, got %v and %v", stepRows[0]["WorkStepCode"], stepRows[3]["WorkStepCode"])
	}
}
