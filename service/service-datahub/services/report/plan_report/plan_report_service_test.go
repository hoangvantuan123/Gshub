package plan_report

import (
	"encoding/json"
	"fmt"
	"os"
	"reflect"
	"sort"
	"strings"
	"testing"

	models "service-datahub/models/report"
)

func planFixture(n int) ([]models.ERPPlanDetail, []models.ERPPlanMaster, []models.ERPProdStatsRemarkType) {
	ptr := func(v string) *string { return &v }
	rows := make([]models.ERPPlanDetail, n)
	for i := range rows {
		rows[i] = models.ERPPlanDetail{IdSeq: fmt.Sprint(i), MasterSeq: "master", RegCode: "GS1-PLAN", RowSeq: i,
			TargetProdQty: ptr("1.234,5"), TargetPassQty: ptr("100"), StatPassQty: ptr("950"),
			PicDp: ptr("PIC"), ItemCode: ptr(fmt.Sprint(i % 3)), MachineName: ptr("Máy GS1"),
			OpTypeName: ptr("Tổ in"), RoutingDocDate: ptr("2026-10-22"), OpDate: ptr("2026-10-23"),
			StatusDpSx: ptr([]string{"Khớp job", "Trượt KH", "SX sai ngày KH", "Khớp số lượng"}[i%4]),
			TimeStatus: ptr("Chậm hơn ĐM"), CapaStatus: ptr("Nhanh hơn capa"),
			RemarkTypeSeq: ptr("remark"), RemarkContent: ptr("ghi chú"), RowVersion: 2}
	}
	return rows, []models.ERPPlanMaster{{IdSeq: "master", RegCode: "GS1-PLAN", ApplyDate: ptr("2026-10-23"), FactoryCode: ptr("GS1")}},
		[]models.ERPProdStatsRemarkType{{IdSeq: "remark", TypeCode: "NOTE", TypeName: "Diễn giải"}}
}

func TestPlanModesPreserveItemsAndSummary(t *testing.T) {
	rows, masters, remarks := planFixture(20001)
	full, err := buildProductionPlanReport(rows, masters, remarks, map[string]string{})
	if err != nil {
		t.Fatal(err)
	}
	detail, err := buildProductionPlanReport(rows, masters, remarks, map[string]string{"detailsOnly": "true", "includeItems": "all", "pageSize": "10000"})
	if err != nil {
		t.Fatal(err)
	}
	if len(detail.Items) != 20001 || !reflect.DeepEqual(full.Items, detail.Items) {
		t.Fatal("detail mode changed or truncated rows")
	}
	projected := make([]models.ERPPlanDetail, len(rows))
	allowed := map[string]bool{}
	for _, column := range planSummaryColumns {
		allowed[strings.Trim(column, `"`)] = true
	}
	for i, row := range rows {
		source, target := reflect.ValueOf(row), reflect.ValueOf(&projected[i]).Elem()
		for j := 0; j < source.NumField(); j++ {
			if allowed[source.Type().Field(j).Name] {
				target.Field(j).Set(source.Field(j))
			}
		}
	}
	summary, err := buildProductionPlanReport(projected, masters, nil, map[string]string{"withoutItems": "true"})
	if err != nil {
		t.Fatal(err)
	}
	if len(summary.Items) != 0 || summary.Pagination.Total != 20001 {
		t.Fatal("summary lost total or constructed details")
	}
	full.Items = summary.Items
	full.Pagination = summary.Pagination
	a, _ := json.Marshal(full)
	b, _ := json.Marshal(summary)
	if string(a) != string(b) {
		t.Fatal("summary projection changed KPI, charts or filters")
	}
}

func TestPlanDateFilterAndEmptyModes(t *testing.T) {
	rows, masters, remarks := planFixture(4)
	for _, mode := range []map[string]string{{}, {"detailsOnly": "true"}, {"withoutItems": "true"}} {
		mode["planDateFrom"] = "2026-10-24"
		report, err := buildProductionPlanReport(rows, masters, remarks, mode)
		if err != nil || report.Pagination.Total != 0 || len(report.Items) != 0 {
			t.Fatalf("date-filtered rows leaked: %+v %v", report, err)
		}
	}
}

func BenchmarkPlanReport20K(b *testing.B) {
	rows, masters, remarks := planFixture(20000)
	for _, mode := range []string{"full", "detailsOnly", "withoutItems"} {
		b.Run(mode, func(b *testing.B) {
			b.ReportAllocs()
			for b.Loop() {
				_, _ = buildProductionPlanReport(rows, masters, remarks, map[string]string{mode: "true"})
			}
		})
	}
}

// The fixture was captured from the pre-optimization implementation at HEAD.
func TestPlanMatchesLegacyReport(t *testing.T) {
	rows, masters, remarks := planFixture(12)
	report, err := buildProductionPlanReport(rows, masters, remarks, map[string]string{"includeItems": "all"})
	if err != nil {
		t.Fatal(err)
	}
	expected, err := os.ReadFile("testdata/legacy_report.json")
	if err != nil {
		t.Fatal(err)
	}
	actual, err := json.Marshal(report)
	if err != nil {
		t.Fatal(err)
	}
	var left, right map[string]interface{}
	if err = json.Unmarshal(expected, &left); err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(actual, &right); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(left["items"], right["items"]) {
		t.Fatal("legacy detail values or ordering changed")
	}
	canonicalReport(left)
	canonicalReport(right)
	if !reflect.DeepEqual(left, right) {
		t.Fatal("legacy KPI/chart/filter values changed")
	}
}
func canonicalReport(v interface{}) {
	switch value := v.(type) {
	case map[string]interface{}:
		for _, child := range value {
			canonicalReport(child)
		}
	case []interface{}:
		for _, child := range value {
			canonicalReport(child)
		}
		sort.Slice(value, func(i, j int) bool {
			a, _ := json.Marshal(value[i])
			b, _ := json.Marshal(value[j])
			return string(a) < string(b)
		})
	}
}
