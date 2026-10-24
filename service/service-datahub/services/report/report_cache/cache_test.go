package report_cache

import "testing"

func TestReportIdentityKeyIgnoresResponseModeAndPagination(t *testing.T) {
	first := map[string]string{
		"factoryCode":  "GS5",
		"regCode":      "GS5-STAT-20261023",
		"masterSeq":    "master-1",
		"exactBatch":   "true",
		"detailsOnly":  "true",
		"includeItems": "all",
		"page":         "1",
		"pageSize":     "10000",
	}
	second := map[string]string{
		"factory_code":  "gs5",
		"Reg_Code":      "GS5-STAT-20261023",
		"master_seq":    "master-1",
		"exact_batch":   "1",
		"details_only":  "1",
		"include_items": "true",
		"page":          "2",
		"page_size":     "500",
	}

	if buildCacheKey("statistics", first) != buildCacheKey("statistics", second) {
		t.Fatal("same report registration produced different cache row keys")
	}
	if buildVariantKey("statistics", first) != buildVariantKey("statistics", second) {
		t.Fatal("details-only pagination produced separate response variants")
	}
}

func TestSummaryAndDetailVariantsShareOneReportRow(t *testing.T) {
	detail := map[string]string{
		"factoryCode": "GS1",
		"regCode":     "GS1-PLAN-20261023",
		"exactBatch":  "true",
		"detailsOnly": "true",
		"pageSize":    "10000",
	}
	summary := map[string]string{
		"factory_code":  "gs1",
		"Reg_Code":      "GS1-PLAN-20261023",
		"without_items": "true",
		"pageSize":      "1",
	}

	if buildCacheKey("plan", detail) != buildCacheKey("plan", summary) {
		t.Fatal("detail and summary responses for one registration must share a cache row")
	}
	if buildVariantKey("plan", detail) == buildVariantKey("plan", summary) {
		t.Fatal("different response shapes must remain separate payload variants")
	}
}

func TestUnscopedSummaryRowKeyIgnoresOutputAndPagination(t *testing.T) {
	first := map[string]string{
		"factoryCode":  "GS5",
		"statDateFrom": "2026-10-01",
		"statDateTo":   "2026-10-23",
		"withoutItems": "true",
		"page":         "1",
		"pageSize":     "1",
	}
	second := map[string]string{
		"factory_code":  "gs5",
		"fromDate":      "2026-10-01",
		"toDate":        "2026-10-23",
		"without_items": "1",
		"page":          "3",
		"page_size":     "100",
	}

	if buildCacheKey("statistics", first) != buildCacheKey("statistics", second) {
		t.Fatal("same unscoped summary query produced different cache row keys")
	}
}

func TestCacheRowKeySeparatesReportIdentity(t *testing.T) {
	base := map[string]string{"factoryCode": "GS1", "regCode": "GS1-PLAN-20261023"}
	otherFactory := map[string]string{"factoryCode": "GS5", "regCode": "GS1-PLAN-20261023"}
	otherRegistration := map[string]string{"factoryCode": "GS1", "regCode": "GS1-PLAN-20261024"}

	key := buildCacheKey("plan", base)
	if key == buildCacheKey("statistics", base) {
		t.Fatal("KHSX and TKSX must have different cache rows")
	}
	if key == buildCacheKey("plan", otherFactory) {
		t.Fatal("different factories must have different cache rows")
	}
	if key == buildCacheKey("plan", otherRegistration) {
		t.Fatal("different registrations must have different cache rows")
	}
}
