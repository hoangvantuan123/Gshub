package report_cache

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	models "service-datahub/models/report"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// CurrentVersion must be incremented when report formulas or the API result shape changes.
// Pure frontend layout changes do not require a cache rebuild.
const CurrentVersion = 2

type Cache struct {
	db     *gorm.DB
	logger *zap.Logger

	mu                sync.Mutex
	inFlight          map[string]*flight
	legacyCleanupMu   sync.Mutex
	legacyRowsCleaned bool
}

type flight struct {
	done chan struct{}
	raw  []byte
	err  error
}

type BatchIdentity struct {
	MasterSeq string
	RegCode   string
}

type metadata struct {
	reportType  string
	factoryCode string
	masterSeq   string
	regCode     string
}

func New(db *gorm.DB, logger *zap.Logger) *Cache {
	return &Cache{db: db, logger: logger, inFlight: make(map[string]*flight)}
}

// GetOrCompute stores response variants under one stable report identity. Concurrent
// cache misses for the same response variant in this service instance share one calculation.
func GetOrCompute[T any](
	cache *Cache,
	ctx context.Context,
	reportType string,
	filters map[string]string,
	compute func() (*T, error),
) (*T, bool, error) {
	meta := metadataFromFilters(reportType, filters)
	key := buildCacheKey(reportType, filters)
	variantKey := buildVariantKey(reportType, filters)
	raw, hit, err := cache.getOrComputeRaw(ctx, key, variantKey, meta, func() ([]byte, error) {
		result, computeErr := compute()
		if computeErr != nil {
			return nil, computeErr
		}
		return json.Marshal(result)
	})
	if err != nil {
		return nil, false, err
	}

	var result T
	if err := json.Unmarshal(raw, &result); err == nil {
		return &result, hit, nil
	}

	// A malformed or incompatible payload is discarded and rebuilt once. Version bumps
	// normally prevent this path; it also protects against manually edited cache rows.
	cache.deleteVariant(ctx, key, variantKey)
	resultPtr, computeErr := compute()
	if computeErr != nil {
		return nil, false, computeErr
	}
	if payload, marshalErr := json.Marshal(resultPtr); marshalErr == nil {
		cache.store(ctx, key, variantKey, meta, payload)
	}
	return resultPtr, false, nil
}

// GetOrComputeJSON returns the cached response bytes directly. Compact report
// transports use this to avoid decoding a large cached report into Go structs
// and encoding the same report again before sending it over gRPC.
func GetOrComputeJSON[T any](
	cache *Cache,
	ctx context.Context,
	reportType string,
	filters map[string]string,
	compute func() (*T, error),
) ([]byte, bool, error) {
	meta := metadataFromFilters(reportType, filters)
	key := buildCacheKey(reportType, filters)
	variantKey := buildVariantKey(reportType, filters)
	return cache.getOrComputeRaw(ctx, key, variantKey, meta, func() ([]byte, error) {
		result, err := compute()
		if err != nil {
			return nil, err
		}
		return json.Marshal(result)
	})
}

func (c *Cache) getOrComputeRaw(
	ctx context.Context,
	key string,
	variantKey string,
	meta metadata,
	compute func() ([]byte, error),
) ([]byte, bool, error) {
	c.cleanupLegacyRows(ctx)
	if raw, ok := c.load(ctx, key, variantKey); ok {
		return raw, true, nil
	}

	flightKey := key + ":" + variantKey
	c.mu.Lock()
	if current, ok := c.inFlight[flightKey]; ok {
		c.mu.Unlock()
		select {
		case <-ctx.Done():
			return nil, false, ctx.Err()
		case <-current.done:
			return append([]byte(nil), current.raw...), true, current.err
		}
	}
	current := &flight{done: make(chan struct{})}
	c.inFlight[flightKey] = current
	c.mu.Unlock()

	// Another process or request may have populated the shared DB cache after the first
	// lookup but before this request acquired the local single-flight slot.
	if raw, ok := c.load(ctx, key, variantKey); ok {
		current.raw = raw
		c.finishFlight(flightKey, current)
		return raw, true, nil
	}

	raw, err := compute()
	if err == nil {
		c.store(ctx, key, variantKey, meta, raw)
	}
	current.raw = append([]byte(nil), raw...)
	current.err = err
	c.finishFlight(flightKey, current)
	return raw, false, err
}

func (c *Cache) finishFlight(key string, current *flight) {
	c.mu.Lock()
	delete(c.inFlight, key)
	close(current.done)
	c.mu.Unlock()
}

func (c *Cache) load(ctx context.Context, key string, variantKey string) ([]byte, bool) {
	var payloadText sql.NullString
	err := c.db.WithContext(ctx).Raw(
		`SELECT ("Payload"->'variants'->?)::text FROM "_ERPReportResultCache" WHERE "CacheKey" = ? AND "CacheVersion" = ?`,
		variantKey,
		key,
		CurrentVersion,
	).Row().Scan(&payloadText)
	if err == nil && payloadText.Valid && payloadText.String != "" {
		return []byte(payloadText.String), true
	}
	if err == nil {
		return nil, false
	}
	if err != sql.ErrNoRows && c.logger != nil {
		c.logger.Warn("Report result cache read failed", zap.Error(err))
	}
	return nil, false
}

func (c *Cache) store(ctx context.Context, key string, variantKey string, meta metadata, result []byte) {
	if len(result) == 0 {
		return
	}
	wrappedPayload, marshalErr := json.Marshal(struct {
		Variants map[string]json.RawMessage `json:"variants"`
	}{Variants: map[string]json.RawMessage{variantKey: result}})
	if marshalErr != nil {
		if c.logger != nil {
			c.logger.Warn("Report result cache payload encoding failed", zap.Error(marshalErr))
		}
		return
	}
	now := time.Now()
	err := c.db.WithContext(ctx).Exec(
		`INSERT INTO "_ERPReportResultCache" ("CacheKey", "ReportType", "FactoryCode", "MasterSeq", "RegCode", "CacheVersion", "Payload", "CreatedAt", "UpdatedAt")
		 VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?)
		 ON CONFLICT ("CacheKey") DO UPDATE SET
		 "ReportType" = EXCLUDED."ReportType",
		 "FactoryCode" = EXCLUDED."FactoryCode",
		 "MasterSeq" = EXCLUDED."MasterSeq",
		 "RegCode" = EXCLUDED."RegCode",
		 "CacheVersion" = EXCLUDED."CacheVersion",
		 "Payload" = jsonb_build_object(
		   'variants',
		   COALESCE("_ERPReportResultCache"."Payload"->'variants', '{}'::jsonb) ||
		   COALESCE(EXCLUDED."Payload"->'variants', '{}'::jsonb)
		 ),
		 "UpdatedAt" = EXCLUDED."UpdatedAt"`,
		key, meta.reportType, meta.factoryCode, meta.masterSeq, meta.regCode, CurrentVersion, string(wrappedPayload), now, now,
	).Error
	if err != nil && c.logger != nil {
		c.logger.Warn("Report result cache write failed", zap.Error(err))
	}
}

// cleanupLegacyRows removes the version-1 request-keyed rows once. Version 2 stores
// multiple response variants under one report identity, so those rows cannot be reused.
func (c *Cache) cleanupLegacyRows(ctx context.Context) {
	c.legacyCleanupMu.Lock()
	defer c.legacyCleanupMu.Unlock()
	if c.legacyRowsCleaned {
		return
	}
	err := c.db.WithContext(ctx).
		Where(`"CacheVersion" < ?`, CurrentVersion).
		Delete(&models.ERPReportResultCache{}).Error
	if err != nil {
		if c.logger != nil {
			c.logger.Warn("Legacy report result cache cleanup failed", zap.Error(err))
		}
		return
	}
	c.legacyRowsCleaned = true
}

func (c *Cache) deleteVariant(ctx context.Context, key string, variantKey string) {
	if err := c.db.WithContext(ctx).Exec(
		`UPDATE "_ERPReportResultCache"
		 SET "Payload" = jsonb_build_object('variants', COALESCE("Payload"->'variants', '{}'::jsonb) - ?),
		     "UpdatedAt" = ?
		 WHERE "CacheKey" = ?`,
		variantKey, time.Now(), key,
	).Error; err != nil && c.logger != nil {
		c.logger.Warn("Report result cache cleanup failed", zap.Error(err))
	}
}

// InvalidateBatchResults removes cached results for the changed batches and cached
// report results that span batches. It is intended to run in the same DB transaction
// as the underlying write.
func InvalidateBatchResults(tx *gorm.DB, reportType string, identities []BatchIdentity) error {
	query := tx.Model(&models.ERPReportResultCache{}).Where(`"ReportType" = ?`, reportType)
	conditions := []string{`COALESCE("MasterSeq", '') = ''`}
	args := []interface{}{}
	masterSeqs := make([]string, 0, len(identities))
	regCodes := make([]string, 0, len(identities))
	for _, identity := range identities {
		if identity.MasterSeq != "" {
			masterSeqs = append(masterSeqs, identity.MasterSeq)
		}
		if identity.RegCode != "" {
			regCodes = append(regCodes, identity.RegCode)
		}
	}
	if len(masterSeqs) > 0 {
		conditions = append(conditions, `"MasterSeq" IN ?`)
		args = append(args, masterSeqs)
	}
	if len(regCodes) > 0 {
		conditions = append(conditions, `"RegCode" IN ?`)
		args = append(args, regCodes)
	}
	query = query.Where("("+strings.Join(conditions, " OR ")+")", args...)
	return query.Delete(&models.ERPReportResultCache{}).Error
}

func buildCacheKey(reportType string, filters map[string]string) string {
	canonicalFilters := normalizeFilters(filters)
	factoryCode := normalizeFactory(filterValue(canonicalFilters, "factoryCode"))
	if factoryCode == "" || factoryCode == "ALL" {
		factoryCode = "ALL"
	}
	regCode := filterValue(canonicalFilters, "regCode")
	masterSeq := filterValue(canonicalFilters, "masterSeq")
	identity := map[string]string{"reportType": strings.ToLower(strings.TrimSpace(reportType))}
	identity["factoryCode"] = factoryCode
	if regCode != "" {
		// Registration code is the stable report identity shared by factory and summary views.
		identity["regCode"] = regCode
	} else if masterSeq != "" {
		identity["masterSeq"] = masterSeq
	} else {
		// Unscoped summary reports are identified by their business filters. Output mode and
		// pagination are stored as variants inside the same row.
		delete(canonicalFilters, "page")
		delete(canonicalFilters, "pageSize")
		delete(canonicalFilters, "includeItems")
		delete(canonicalFilters, "withoutItems")
		delete(canonicalFilters, "detailsOnly")
		delete(canonicalFilters, "compactTransport")
		identity["filters"] = encodeCanonicalFilters(canonicalFilters)
	}
	encoded, _ := json.Marshal(identity)
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}

func buildVariantKey(reportType string, filters map[string]string) string {
	canonicalFilters := normalizeFilters(filters)
	// These values already define the cache row's report identity.
	delete(canonicalFilters, "factoryCode")
	delete(canonicalFilters, "regCode")
	delete(canonicalFilters, "masterSeq")
	delete(canonicalFilters, "compactTransport")

	// Both report builders return all rows in details-only mode. Pagination flags are
	// transport details and should not create another cached result for the same report.
	detailsOnly := filterValue(canonicalFilters, "detailsOnly")
	if detailsOnly == "true" || detailsOnly == "1" {
		delete(canonicalFilters, "page")
		delete(canonicalFilters, "pageSize")
		delete(canonicalFilters, "includeItems")
	}
	// Plan reports ignore these pagination controls and always return the full item set.
	if strings.EqualFold(strings.TrimSpace(reportType), "plan") {
		delete(canonicalFilters, "page")
		delete(canonicalFilters, "pageSize")
		delete(canonicalFilters, "includeItems")
	}
	return hashCanonicalFilters(canonicalFilters)
}

func hashCanonicalFilters(filters map[string]string) string {
	sum := sha256.Sum256([]byte(encodeCanonicalFilters(filters)))
	return hex.EncodeToString(sum[:])
}

func encodeCanonicalFilters(filters map[string]string) string {
	keys := make([]string, 0, len(filters))
	for key := range filters {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	canonical := make([][2]string, 0, len(keys))
	for _, key := range keys {
		canonical = append(canonical, [2]string{key, filters[key]})
	}
	encoded, _ := json.Marshal(canonical)
	return string(encoded)
}

func normalizeFilters(filters map[string]string) map[string]string {
	keys := make([]string, 0, len(filters))
	for key := range filters {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	canonical := make(map[string]string, len(filters))
	for _, key := range keys {
		value := strings.TrimSpace(filters[key])
		if value == "" {
			continue
		}
		name := canonicalFilterName(key)
		if strings.EqualFold(name, "factoryCode") {
			value = normalizeFactory(value)
		} else if isBooleanFilter(name) {
			value = normalizeBoolean(value)
		}
		if existing, ok := canonical[name]; ok {
			if existing == value {
				continue
			}
			// Preserve conflicting aliases so unlike filters never collide.
			name += ":" + strings.ToLower(strings.TrimSpace(key))
		}
		canonical[name] = value
	}
	return canonical
}

func canonicalFilterName(name string) string {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "factorycode", "factory_code", "plantcode", "plant_code":
		return "factoryCode"
	case "regcode", "reg_code":
		return "regCode"
	case "masterseq", "master_seq", "idseq", "id_seq":
		return "masterSeq"
	case "plandatefrom", "plan_date_from", "statdatefrom", "stat_date_from", "fromdate", "datefrom", "from_date", "date_from":
		return "fromDate"
	case "plandateto", "plan_date_to", "statdateto", "stat_date_to", "todate", "dateto", "to_date", "date_to":
		return "toDate"
	case "teamname", "team_name", "team", "optypename", "op_type_name":
		return "teamName"
	case "picdp", "pic_dp", "planner":
		return "pic"
	case "machinecode", "machine_code", "machine", "machinename", "machine_name":
		return "machineCode"
	case "itemcode", "item_code":
		return "itemCode"
	case "orderno", "order_no", "routingdocno", "routing_doc_no":
		return "orderNo"
	case "statusdpsx", "status_dp_sx":
		return "status"
	case "shiftname", "shift_name":
		return "shift"
	case "fromtime", "starttime", "from_time", "start_time":
		return "fromTime"
	case "totime", "endtime", "to_time", "end_time":
		return "toTime"
	case "detailsonly", "details_only":
		return "detailsOnly"
	case "withoutitems", "without_items":
		return "withoutItems"
	case "includeitems", "include_items", "withitems", "with_items":
		return "includeItems"
	case "pagesize", "page_size":
		return "pageSize"
	case "page", "pagenumber", "page_number":
		return "page"
	case "exactbatch", "exact_batch":
		return "exactBatch"
	case "compacttransport", "compact_transport":
		return "compactTransport"
	default:
		return strings.ToLower(strings.TrimSpace(name))
	}
}

func isBooleanFilter(name string) bool {
	switch name {
	case "detailsOnly", "withoutItems", "exactBatch", "compactTransport":
		return true
	default:
		return false
	}
}

func normalizeBoolean(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return "true"
	case "0", "false", "no", "off":
		return "false"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func normalizeFactory(value string) string {
	return strings.ToUpper(strings.TrimSpace(value))
}

func metadataFromFilters(reportType string, filters map[string]string) metadata {
	filters = normalizeFilters(filters)
	factoryCode := filterValue(filters, "factoryCode")
	if factoryCode == "" || strings.EqualFold(factoryCode, "all") {
		factoryCode = "ALL"
	}
	return metadata{
		reportType:  strings.ToLower(strings.TrimSpace(reportType)),
		factoryCode: strings.ToUpper(factoryCode),
		masterSeq:   filterValue(filters, "masterSeq"),
		regCode:     filterValue(filters, "regCode"),
	}
}

func NormalizeReportType(reportType string) string {
	value := strings.ToLower(strings.TrimSpace(reportType))
	if strings.Contains(value, "stat") || strings.Contains(value, "tksx") {
		return "statistics"
	}
	return "plan"
}

func filterValue(filters map[string]string, names ...string) string {
	for _, name := range names {
		for key, value := range filters {
			if strings.EqualFold(key, name) && strings.TrimSpace(value) != "" {
				return strings.TrimSpace(value)
			}
		}
	}
	return ""
}

// StableCacheKey is exported for diagnostics and future cache administration tools.
func StableCacheKey(reportType string, filters map[string]string) string {
	return fmt.Sprintf("%s:%s:%s", reportType, buildCacheKey(reportType, filters), buildVariantKey(reportType, filters))
}
