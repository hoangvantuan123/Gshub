package caller

import (
	"encoding/json"
	"testing"

	"github.com/jhump/protoreflect/desc/protoparse"
	"github.com/jhump/protoreflect/dynamic"
)

func TestFlattenCodeHelpResult(t *testing.T) {
	body := map[string]interface{}{
		"result": map[string]interface{}{
			"CodeHelpName": "SUBMENU",
			"KeyValue":     "report",
			"KeyItem3":     "400",
			"page":         "1",
			"limit":        "50",
		},
	}

	flattenCodeHelpResult("/datahub.DataHubService/QueryCodeHelp", body)

	if body["CodeHelpName"] != "SUBMENU" || body["KeyItem3"] != "400" || body["limit"] != "50" {
		t.Fatalf("expected lookup fields at request root, got %#v", body)
	}
	if _, exists := body["result"]; exists {
		t.Fatalf("expected result envelope to be removed, got %#v", body)
	}
}

func TestFlattenCodeHelpResultLeavesOtherMethodsUntouched(t *testing.T) {
	result := map[string]interface{}{"Key": "value"}
	body := map[string]interface{}{"result": result}

	flattenCodeHelpResult("/datahub.DataHubService/SomeOtherMethod", body)

	if body["result"] == nil || body["Key"] != nil {
		t.Fatalf("unexpected mutation for non-CodeHelp method: %#v", body)
	}
}

func TestFillMessageKeepsRootReconciliationFlagInFiltersJson(t *testing.T) {
	parser := protoparse.Parser{Accessor: protoparse.FileContentsFromMap(map[string]string{
		"reconciliation.proto": `syntax = "proto3";
message ReconciliationRequest {
  string master_seq = 1;
  string reg_code = 2;
  string filters_json = 50;
}`,
	})}
	files, err := parser.ParseFiles("reconciliation.proto")
	if err != nil {
		t.Fatal(err)
	}
	request := dynamic.NewMessage(files[0].FindMessage("ReconciliationRequest"))
	body := map[string]interface{}{
		"masterSeq":          "master-1",
		"regCode":            "reg-1",
		"reconciliationOnly": true,
	}

	fillMessage(request, body)

	filtersJSON, ok := request.GetFieldByName("filters_json").(string)
	if !ok || filtersJSON == "" {
		t.Fatalf("filters_json was not populated: %#v", request.GetFieldByName("filters_json"))
	}
	var filters map[string]interface{}
	if err := json.Unmarshal([]byte(filtersJSON), &filters); err != nil {
		t.Fatalf("invalid filters_json %q: %v", filtersJSON, err)
	}
	if filters["reconciliationOnly"] != true {
		t.Fatalf("reconciliationOnly flag was lost before gRPC: %#v", filters)
	}
}

func TestFillMessageDoesNotWrapExplicitFiltersJsonAgain(t *testing.T) {
	parser := protoparse.Parser{Accessor: protoparse.FileContentsFromMap(map[string]string{
		"filters.proto": `syntax = "proto3";
message FilterRequest { string master_seq = 1; string filters_json = 50; }`,
	})}
	files, err := parser.ParseFiles("filters.proto")
	if err != nil {
		t.Fatal(err)
	}
	request := dynamic.NewMessage(files[0].FindMessage("FilterRequest"))
	filtersJSON := `{"reconciliationOnly":true}`
	fillMessage(request, map[string]interface{}{
		"masterSeq":   "master-1",
		"filtersJson": filtersJSON,
	})

	if actual := request.GetFieldByName("filters_json"); actual != filtersJSON {
		t.Fatalf("explicit filters_json was wrapped or overwritten: got %#v", actual)
	}
}
