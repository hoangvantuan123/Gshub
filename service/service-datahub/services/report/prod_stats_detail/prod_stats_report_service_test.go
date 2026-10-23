package prod_stats_detail

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

func statsFixture(n int) ([]models.ERPProdStatsDetail, []models.ERPPlanMaster, []models.ERPProdStatsRemarkType) {
	ptr := func(v string) *string { return &v }
	rows := make([]models.ERPProdStatsDetail, n)
	for i := range rows {
		rows[i] = models.ERPProdStatsDetail{IdSeq: fmt.Sprint(i), MasterSeq: "master", RegCode: "GS5-STAT", RowSeq: i,
			TargetProdQty: ptr("1.234,5"), ProdQty: ptr("950"), PassQty: ptr("900"), DefectQty: ptr("50"),
			ActualRunTime: ptr([]string{"4", "120", "800", "01:30"}[i%4]), BreakdownMinutes: ptr("2"),
			TeamName: ptr("Tổ in"), MachineCode: ptr([]string{"GS5-01", "HN-SON-NO-CHECK-1"}[i%2]), MachineName: ptr("Máy in"),
			StatDate: ptr("2026-10-22"), StartDate: ptr("2026-10-22"), EndDate: ptr("2026-10-22"), Shift: ptr("Ca 1"),
			AutoIoStatus:           ptr([]string{"Có XKTĐ", "Thiếu XKTĐ", "Không sử dụng NVL"}[i%3]),
			TicketCreationLocation: ptr([]string{"MES", "BRAVO"}[i%2]), SyncDelayMinutes: ptr("0.5"), Status: ptr("Hoàn thành"),
			RemarkTypeSeq: ptr("remark"), RemarkContent: ptr("ghi chú"), RowVersion: 3}
	}
	return rows, []models.ERPPlanMaster{{IdSeq: "master", RegCode: "GS5-STAT", ApplyDate: ptr("2026-10-23")}},
		[]models.ERPProdStatsRemarkType{{IdSeq: "remark", TypeCode: "NOTE", TypeName: "Diễn giải"}}
}

func TestStatisticsModesPreserveItemsAndSummary(t *testing.T) {
	rows, masters, remarks := statsFixture(20001)
	full, err := buildProductionStatisticsReport(rows, masters, remarks, map[string]string{"includeItems": "all"})
	if err != nil {
		t.Fatal(err)
	}
	detail, err := buildProductionStatisticsReport(rows, masters, remarks, map[string]string{"detailsOnly": "true", "includeItems": "all", "pageSize": "10000"})
	if err != nil {
		t.Fatal(err)
	}
	if len(detail.Items) != 20001 || !reflect.DeepEqual(full.Items, detail.Items) {
		t.Fatal("detail mode changed or truncated rows")
	}
	projected := make([]models.ERPProdStatsDetail, len(rows))
	allowed := map[string]bool{}
	for _, column := range statsSummaryColumns {
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
	summary, err := buildProductionStatisticsReport(projected, masters, nil, map[string]string{"withoutItems": "true"})
	if err != nil {
		t.Fatal(err)
	}
	if len(summary.Items) != 0 || summary.Pagination.Total != 20001 {
		t.Fatal("summary lost total or constructed details")
	}
	full.Items, full.Pagination = summary.Items, summary.Pagination
	a, _ := json.Marshal(full)
	b, _ := json.Marshal(summary)
	if string(a) != string(b) {
		var left, right map[string]json.RawMessage
		_ = json.Unmarshal(a, &left)
		_ = json.Unmarshal(b, &right)
		for key, value := range left {
			if string(value) != string(right[key]) {
				t.Errorf("mismatch %s: full=%s summary=%s", key, value, right[key])
			}
		}
	}
}

func TestStatisticsPaginationKeepsFullTotals(t *testing.T) {
	rows, masters, remarks := statsFixture(11)
	report, err := buildProductionStatisticsReport(rows, masters, remarks, map[string]string{"pageSize": "4", "page": "3"})
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Items) != 3 || report.Summary.TotalTickets != 11 || report.Pagination.Total != 11 || report.Items[0].IdSeq != "8" {
		t.Fatal("pagination changed full-report totals or ordering")
	}
	report, err = buildProductionStatisticsReport(rows, masters, remarks, map[string]string{"withoutItems": "true", "detailsOnly": "true", "statDateFrom": "2026-10-24"})
	if err != nil || report.Pagination.Total != 0 || len(report.Items) != 0 {
		t.Fatal("withoutItems/date filter must take precedence")
	}
}

func BenchmarkStatisticsReport20K(b *testing.B) {
	rows, masters, remarks := statsFixture(20000)
	for _, mode := range []string{"full", "detailsOnly", "withoutItems"} {
		b.Run(mode, func(b *testing.B) {
			b.ReportAllocs()
			for b.Loop() {
				_, _ = buildProductionStatisticsReport(rows, masters, remarks, map[string]string{mode: "true", "includeItems": "all"})
			}
		})
	}
}

// The fixture was captured from the pre-optimization implementation at HEAD.
func TestStatisticsMatchesLegacyReport(t *testing.T) {
	rows, masters, remarks := statsFixture(12)
	report, err := buildProductionStatisticsReport(rows, masters, remarks, map[string]string{"includeItems": "all"})
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
