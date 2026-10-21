package caller

import "testing"

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
