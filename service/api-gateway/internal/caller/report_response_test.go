package caller

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/jhump/protoreflect/desc/protoparse"
	"github.com/jhump/protoreflect/dynamic"
)

func reportMessage(t *testing.T) *dynamic.Message {
	t.Helper()
	parser := protoparse.Parser{Accessor: protoparse.FileContentsFromMap(map[string]string{"report.proto": `syntax = "proto3";
message Report { bool success = 1; string message = 2; string data_json = 3;
int64 total_records = 4; int32 total_pages = 5; int32 page = 6; int32 page_size = 7; }`})}
	files, err := parser.ParseFiles("report.proto")
	if err != nil {
		t.Fatal(err)
	}
	return dynamic.NewMessage(files[0].FindMessage("Report"))
}

func TestProductionReportResultPreservesPayloadAndMetadata(t *testing.T) {
	msg := reportMessage(t)
	raw := `{"items":[{"IdSeq":"1","PassQty":"1.234,5","RemarkContent":"Nội dung \"A\""}],"summary":{"totalTickets":20001}}`
	msg.SetFieldByName("success", true)
	msg.SetFieldByName("message", "report success")
	msg.SetFieldByName("data_json", raw)
	msg.SetFieldByName("total_records", int64(20001))
	msg.SetFieldByName("total_pages", int32(3))
	msg.SetFieldByName("page", int32(2))
	msg.SetFieldByName("page_size", int32(10000))
	result, ok := productionReportResult(msg)
	if !ok || !result.Success || string(result.Data.(json.RawMessage)) != raw {
		t.Fatal("report payload changed")
	}
	page := result.Pagination.(map[string]interface{})
	if page["total"] != "20001" || page["page"] != int32(2) || page["pageSize"] != int32(10000) {
		t.Fatalf("metadata changed: %#v", page)
	}
	encoded, err := json.Marshal(result)
	if err != nil || !strings.Contains(string(encoded), `"data":{"items"`) {
		t.Fatal("payload was escaped as a JSON string")
	}
}

func TestProductionReportResultFallsBackForMissingOrInvalidPayload(t *testing.T) {
	for _, raw := range []string{"", "null", `{"broken":`, `"text"`} {
		msg := reportMessage(t)
		msg.SetFieldByName("data_json", raw)
		if _, ok := productionReportResult(msg); ok {
			t.Fatalf("invalid report accepted: %q", raw)
		}
	}
}
